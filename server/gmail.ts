import { google, Auth } from 'googleapis';
import {
  getGmailConnectionSecrets,
  saveGmailOAuthConnection,
  updateGmailConnectionStatus,
  updateGmailRefreshedTokens,
  disconnectGmailConnection,
} from './db';
import { encryptToken, decryptToken } from './crypto';
import { GmailMessagePreview, GmailTestResult } from '../src/types';

// ============================================================================
// GOOGLE GMAIL OAUTH CONFIGURATION
// ============================================================================

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Validates that the necessary Google OAuth server environment variables are set.
 */
export function validateGoogleOAuthConfig(): void {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth credentials are not configured on the server. Please check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in environment variables.');
  }
}

/**
 * Creates an unauthenticated OAuth2Client instance configured with server credentials.
 */
export function createOAuth2Client(): Auth.OAuth2Client {
  validateGoogleOAuthConfig();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generates the Google OAuth authorization URL for the user to grant Gmail read-only access.
 */
export function generateGmailAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',     // Forces consent prompt to ensure refresh_token is returned
    include_granted_scopes: true,
    scope: [GMAIL_READONLY_SCOPE],
    state,
  });
}

/**
 * Exchanges the Google authorization code for access and refresh tokens,
 * retrieves the authorized Gmail email address, encrypts tokens, and stores them.
 */
export async function handleGmailOAuthCallback(
  orgId: string,
  code: string
): Promise<{ accountEmail: string }> {
  const oauth2Client = createOAuth2Client();

  // Exchange authorization code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token) {
    throw new Error('Google OAuth exchange did not return an access token.');
  }

  oauth2Client.setCredentials(tokens);

  // Retrieve authenticated Gmail user profile
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const accountEmail = profileRes.data.emailAddress;

  if (!accountEmail) {
    throw new Error('Failed to retrieve email address from Gmail user profile.');
  }

  // Encrypt secrets at rest before persisting
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined;
  const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined;

  const scopes = tokens.scope ? tokens.scope.split(' ') : [GMAIL_READONLY_SCOPE];

  await saveGmailOAuthConnection(orgId, {
    accountEmail,
    encryptedAccessToken,
    encryptedRefreshToken,
    tokenExpiresAt,
    scopes,
  });

  return { accountEmail };
}

/**
 * Creates an authenticated Gmail API client for a specific tenant organization.
 * Restores and decrypts credentials, and attaches a token refresh listener to
 * automatically re-encrypt and persist refreshed access tokens.
 */
export async function getAuthenticatedGmailClient(orgId: string): Promise<{
  gmail: ReturnType<typeof google.gmail>;
  oauth2Client: Auth.OAuth2Client;
  accountEmail: string;
}> {
  const connection = await getGmailConnectionSecrets(orgId);
  if (!connection || connection.status === 'DISCONNECTED') {
    throw new Error('Gmail is not connected for this organization.');
  }

  if (!connection.encryptedAccessToken) {
    throw new Error('Missing Gmail credentials. Please reconnect Gmail.');
  }

  let accessToken = '';
  let refreshToken = '';

  try {
    accessToken = decryptToken(connection.encryptedAccessToken);
    if (connection.encryptedRefreshToken) {
      refreshToken = decryptToken(connection.encryptedRefreshToken);
    }
  } catch {
    await updateGmailConnectionStatus(orgId, 'ERROR', undefined, 'Decryption error. Please reconnect Gmail.');
    throw new Error('Failed to decrypt stored Gmail credentials. Please reconnect Gmail.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
    expiry_date: connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).getTime() : undefined,
  });

  // Listen for automatic token refresh events emitted by googleapis
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      if (newTokens.access_token) {
        const encryptedNewAccess = encryptToken(newTokens.access_token);
        const encryptedNewRefresh = newTokens.refresh_token ? encryptToken(newTokens.refresh_token) : undefined;
        const newExpiry = newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : undefined;

        await updateGmailRefreshedTokens(orgId, encryptedNewAccess, newExpiry, encryptedNewRefresh);
      }
    } catch (err) {
      console.error('Error persisting refreshed Gmail token for org:', orgId, err);
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  return { gmail, oauth2Client, accountEmail: connection.accountIdentifier };
}

/**
 * Real Gmail API Connection Test:
 * Calls `gmail.users.getProfile({ userId: 'me' })` to verify active authorization.
 */
export async function testGmailConnection(orgId: string): Promise<GmailTestResult> {
  try {
    const { gmail } = await getAuthenticatedGmailClient(orgId);
    const profile = await gmail.users.getProfile({ userId: 'me' });

    const email = profile.data.emailAddress || 'connected';
    const messagesTotal = profile.data.messagesTotal || 0;
    const threadsTotal = profile.data.threadsTotal || 0;
    const nowIso = new Date().toISOString();

    // Mark connection active and timestamp verification
    await updateGmailConnectionStatus(orgId, 'CONNECTED', nowIso);

    return {
      success: true,
      email,
      messagesTotal,
      threadsTotal,
      lastTestedAt: nowIso,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown Gmail error';
    const isAuthError =
      errMsg.includes('invalid_grant') ||
      errMsg.includes('401') ||
      errMsg.includes('Token has been expired or revoked') ||
      errMsg.includes('credentials');

    const status = isAuthError ? 'EXPIRED' : 'ERROR';
    const userMessage = isAuthError
      ? 'Gmail connection is no longer valid. Please reconnect Gmail.'
      : 'Failed to communicate with Gmail API. Please check your connection.';

    await updateGmailConnectionStatus(orgId, status, undefined, userMessage);
    throw new Error(userMessage);
  }
}

/**
 * Real Gmail Message Read Test:
 * Reads up to 5-10 recent messages from the user's inbox to verify read-only access.
 * Performs safe header extraction (Subject, From, To, Date) and snippet decoding.
 * Does NOT perform invoice classification, PDF extraction, or background polling.
 */
export async function getRecentGmailMessages(
  orgId: string,
  limit: number = 5
): Promise<GmailMessagePreview[]> {
  const maxResults = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const { gmail } = await getAuthenticatedGmailClient(orgId);

  // List recent messages
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    includeSpamTrash: false,
  });

  const messageList = listRes.data.messages || [];
  if (messageList.length === 0) {
    return [];
  }

  const results: GmailMessagePreview[] = [];

  for (const item of messageList) {
    if (!item.id) continue;

    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: item.id,
        format: 'full',
      });

      const msgData = msgRes.data;
      const headers = msgData.payload?.headers || [];

      const getHeader = (name: string): string => {
        const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
        return found?.value || '';
      };

      const subject = getHeader('subject') || '(No Subject)';
      const from = getHeader('from') || 'Unknown Sender';
      const to = getHeader('to') || 'Unknown Recipient';
      const date = getHeader('date') || (msgData.internalDate ? new Date(Number(msgData.internalDate)).toISOString() : new Date().toISOString());
      const snippet = msgData.snippet || '';

      // Extract plain text snippet/preview safely from parts if available
      let bodyPreview = snippet;
      if (msgData.payload?.body?.data) {
        const decoded = Buffer.from(msgData.payload.body.data, 'base64url').toString('utf8');
        bodyPreview = decoded.slice(0, 300);
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find((p) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          const decoded = Buffer.from(textPart.body.data, 'base64url').toString('utf8');
          bodyPreview = decoded.slice(0, 300);
        }
      }

      results.push({
        id: item.id,
        threadId: msgData.threadId || item.id,
        subject,
        from,
        to,
        date,
        snippet,
        bodyPreview,
      });
    } catch (msgErr) {
      console.error(`Failed to fetch message details for ${item.id}:`, msgErr);
    }
  }

  return results;
}

/**
 * Disconnects the organization's Gmail connection:
 * Attempts token revocation on Google's OAuth server, then marks connection DISCONNECTED in DB.
 */
export async function disconnectGmailIntegration(orgId: string): Promise<void> {
  try {
    const connection = await getGmailConnectionSecrets(orgId);
    if (connection && connection.encryptedAccessToken) {
      try {
        const accessToken = decryptToken(connection.encryptedAccessToken);
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(accessToken);
      } catch (revokeErr) {
        console.warn('Google OAuth revoke returned error (token may already be invalidated):', revokeErr);
      }
    }
  } catch {
    // Continue with local disconnection regardless of external Google response
  }

  await disconnectGmailConnection(orgId);
}
