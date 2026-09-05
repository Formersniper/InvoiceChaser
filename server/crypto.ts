import crypto from 'crypto';

// ============================================================================
// TOKEN & DATA ENCRYPTION (AES-256-GCM Authenticated Encryption)
// ============================================================================

/**
 * Derives a consistent 32-byte (256-bit) cryptographic key from the environment.
 * If GOOGLE_TOKEN_ENCRYPTION_KEY is provided, hashes it with SHA-256 to guarantee
 * exactly 32 bytes regardless of user string format.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY || 'invoicechaser-default-dev-encryption-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a sensitive string (such as an OAuth access or refresh token) using AES-256-GCM.
 * Output format: "iv_hex:authTag_hex:ciphertext_hex"
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Validates the authentication tag to ensure ciphertext integrity.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format.');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// OAUTH STATE SIGNING & VERIFICATION (CSRF Protection)
// ============================================================================

export interface OAuthStatePayload {
  userId: string;
  organizationId: string;
  provider: 'GMAIL';
  nonce: string;
  timestamp: number;
}

/**
 * Creates a signed, base64url-encoded OAuth state parameter with an HMAC-SHA256 signature.
 */
export function createSignedOAuthState(userId: string, organizationId: string): string {
  const payload: OAuthStatePayload = {
    userId,
    organizationId,
    provider: 'GMAIL',
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  
  const key = getEncryptionKey();
  const signature = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Validates a signed OAuth state parameter.
 * Checks signature integrity and enforces a 10-minute expiry window.
 */
export function verifySignedOAuthState(stateStr: string): OAuthStatePayload {
  if (!stateStr || typeof stateStr !== 'string') {
    throw new Error('Missing or invalid OAuth state parameter.');
  }

  const parts = stateStr.split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed OAuth state format.');
  }

  const [payloadBase64, providedSig] = parts;
  const key = getEncryptionKey();
  const expectedSig = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) {
    throw new Error('OAuth state signature verification failed.');
  }

  const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  const payload: OAuthStatePayload = JSON.parse(jsonStr);

  // Enforce 10-minute validity
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  if (Date.now() - payload.timestamp > TEN_MINUTES_MS) {
    throw new Error('OAuth state parameter has expired. Please initiate connection again.');
  }

  if (payload.provider !== 'GMAIL') {
    throw new Error('Invalid OAuth state provider.');
  }

  return payload;
}
