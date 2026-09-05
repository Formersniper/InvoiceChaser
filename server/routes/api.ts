import { Router, Request, Response } from 'express';
import { getSupabase } from '../supabase';
import { RelationshipType, User, Organization, WorkspaceSnapshot } from '../../src/types';
import {
  findUserById,
  upsertUserRecord,
  createOrganizationForUser,
  getUserOrganizations,
  getWorkspaceSnapshot,
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoicePaid,
  pauseInvoice,
  resumeInvoice,
  disputeInvoice,
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  approveAndSendReminder,
  cancelReminder,
  getEmailEvents,
  getAuditLogs,
  createAuditLog,
  getConnections,
  upsertConnection,
  disconnectConnection,
  getAutomationSettings,
  updateAutomationSettings,
  getAISettings,
  updateAISettings,
  updateSubscriptionPlan,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateOrganization,
  updateUserProfile,
} from '../db';
import { requireAuth, requireOrgMember, AuthenticatedRequest } from '../auth';
import { generateReminderDraft } from '../gemini';
import { createSignedOAuthState, verifySignedOAuthState } from '../crypto';
import {
  validateGoogleOAuthConfig,
  generateGmailAuthUrl,
  handleGmailOAuthCallback,
  testGmailConnection,
  getRecentGmailMessages,
  disconnectGmailIntegration,
} from '../gmail';

export const apiRouter = Router();

/* -------------------------------------------------------------
   COOKIE CONFIGURATION & PUBLIC AUTH ENDPOINTS (Supabase Auth)
------------------------------------------------------------- */
export function getAuthCookieOptions(req: Request) {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: Boolean(isHttps),
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

apiRouter.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, companyName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const supabase = getSupabase();

    // 1. Create or resolve user in Supabase Auth via admin (auto-confirms email to prevent rate-limiting & confirmation lockouts)
    let authUser: { id: string; email?: string } | null = null;
    let token: string | undefined = undefined;

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: cleanName,
        companyName: companyName ? companyName.trim() : `${cleanName}'s Studio`,
      },
    });

    if (createError) {
      const errMsg = createError.message.toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists')) {
        // User already registered; attempt login
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInErr || !signInData.user || !signInData.session) {
          return res.status(400).json({
            error: 'An account with this email already exists. Please sign in with your password or use a different email.',
          });
        }
        authUser = signInData.user;
        token = signInData.session.access_token;
      } else {
        return res.status(400).json({
          error: createError.message || 'Failed to create user in Supabase Auth.',
        });
      }
    } else if (createData.user) {
      authUser = createData.user;
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInData?.session?.access_token) {
        token = signInData.session.access_token;
      } else if (signInErr) {
        return res.status(400).json({ error: signInErr.message });
      }
    }

    if (!authUser || !token) {
      return res.status(400).json({ error: 'Failed to establish Supabase session.' });
    }

    // 2. Ensure application profile exists in public.users
    const user = await upsertUserRecord({
      id: authUser.id,
      email: normalizedEmail,
      name: cleanName,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });

    // 3. Create initial organization & owner membership
    const { organization, membership } = await createOrganizationForUser(
      user,
      companyName ? companyName.trim() : `${cleanName}'s Studio`
    );

    // 4. Set authoritative httpOnly session cookie with proper Path, Secure & SameSite
    res.cookie('ic_token', token, getAuthCookieOptions(req));

    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization,
      membership,
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed.';
    console.error('Signup error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    // 1. Authenticate with Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // If unconfirmed email prevents login, auto-confirm via admin and retry
    if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const match = listData?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail);
      if (match) {
        await supabase.auth.admin.updateUserById(match.id, { email_confirm: true });
        const retry = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (retry.data?.session && retry.data?.user) {
          authData = retry.data;
          authError = null;
        }
      }
    }

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({ error: authError?.message || 'Invalid email or password.' });
    }

    const authUser = authData.user;
    const token = authData.session.access_token;

    // 2. Resolve or upsert profile in public.users
    let user = await findUserById(authUser.id);
    if (!user) {
      const name =
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split('@')[0] : 'User');
      user = await upsertUserRecord({
        id: authUser.id,
        email: authUser.email || normalizedEmail,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    // 3. Resolve user organizations
    const orgs = await getUserOrganizations(user.id);
    let organization = orgs[0];

    if (!organization) {
      const orgName = authUser.user_metadata?.companyName || `${user.name}'s Studio`;
      const created = await createOrganizationForUser(user, orgName);
      organization = created.organization;
    }

    // 4. Set authoritative httpOnly session cookie with proper Path, Secure & SameSite
    res.cookie('ic_token', token, getAuthCookieOptions(req));

    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization,
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed.';
    console.error('Login error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      message: `Password reset instructions have been sent to ${email}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Password reset failed.';
    console.error('Forgot password error:', msg);
    return res.status(500).json({ error: msg });
  }
});

export async function ensureUserWorkspace(authUser: {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  companyName?: string;
}): Promise<{ user: User; organization: Organization; workspace: WorkspaceSnapshot }> {
  let user = await findUserById(authUser.id);
  if (!user) {
    user = await upsertUserRecord({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      avatarUrl: authUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authUser.name)}`,
    });
  }

  const orgs = await getUserOrganizations(user.id);
  let organization = orgs[0];

  if (!organization) {
    const orgName = authUser.companyName || `${user.name}'s Studio`;
    const created = await createOrganizationForUser(user, orgName);
    organization = created.organization;
  }

  const workspace = await getWorkspaceSnapshot(user.id, organization.id);
  return { user, organization, workspace };
}

apiRouter.get('/auth/config', (_req, res) => {
  return res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  });
});

/**
 * Server-Authoritative Google OAuth Initiation:
 * Calls Supabase Auth to generate the Google OAuth authorization URL.
 * Scopes are STRICTLY limited to 'openid email profile'.
 * Does NOT request gmail.readonly.
 */
apiRouter.get('/auth/google', async (req, res) => {
  try {
    const supabase = getSupabase();
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const redirectUrl = `${proto}://${host}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error || !data?.url) {
      console.error('Failed to initialize Supabase Google OAuth:', error?.message);
      return res.status(500).json({ error: 'Failed to initiate Google authentication. Please try again.' });
    }

    if (req.headers.accept?.includes('application/json')) {
      return res.json({ url: data.url });
    }
    return res.redirect(data.url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google OAuth initiation error:', msg);
    return res.status(500).json({ error: 'Failed to start Google sign-in.' });
  }
});

/**
 * Authoritative Supabase Session Synchronization Endpoint:
 * Validates Google OAuth Supabase session (or authorization code) on the backend.
 * Ensures user profile exists in public.users (Supabase user ID = public.users.id).
 * Resolves or creates user organization.
 * Sets secure, httpOnly cookies (ic_token & sb_token) for subsequent authenticated requests.
 * Never trusts arbitrary client-supplied user IDs or email matching.
 * Does NOT expose tokens back to the browser in the JSON response.
 */
apiRouter.post('/auth/session', async (req, res) => {
  try {
    const { accessToken, code } = req.body;
    const supabase = getSupabase();

    let resolvedToken = accessToken as string | undefined;

    // 1. If PKCE authorization code was returned, exchange it for session
    if (!resolvedToken && code) {
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !exchangeData?.session?.access_token) {
        return res.status(400).json({
          error: exchangeError?.message || 'Failed to exchange authorization code for Supabase session.',
        });
      }
      resolvedToken = exchangeData.session.access_token;
    }

    if (!resolvedToken) {
      return res.status(400).json({ error: 'Supabase access token or authorization code is required.' });
    }

    // 2. Authoritatively verify session token against Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.getUser(resolvedToken);
    if (userError || !userData?.user) {
      return res.status(401).json({
        error: userError?.message || 'Invalid or expired Supabase session. Please sign in again.',
      });
    }

    const authUser = userData.user;

    // 3. Extract profile information from Google identity metadata
    const googleName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (authUser.email ? authUser.email.split('@')[0] : 'User');

    const googleAvatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName)}`;

    // 4. Ensure public.users and organization workspace exist
    const { user, organization, workspace } = await ensureUserWorkspace({
      id: authUser.id,
      email: authUser.email || '',
      name: googleName,
      avatarUrl: googleAvatar,
      companyName: authUser.user_metadata?.companyName,
    });

    // 5. Set authoritative httpOnly session cookies (ic_token & sb_token)
    res.cookie('ic_token', resolvedToken, getAuthCookieOptions(req));
    res.cookie('sb_token', resolvedToken, getAuthCookieOptions(req));

    // Return authenticated user and workspace snapshot without exposing raw JWTs
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization,
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session synchronization failed.';
    console.error('Session sync error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  const cookieOpts = getAuthCookieOptions(req);
  res.clearCookie('ic_token', {
    path: '/',
    httpOnly: true,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
  });
  res.clearCookie('sb_token', {
    path: '/',
    httpOnly: true,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/* -------------------------------------------------------------
   AUTHENTICATED USER & WORKSPACE
------------------------------------------------------------- */
/**
 * Protected Auth Healthcheck:
 * Proves server-side authentication and session validity.
 * - Unauthenticated request -> 401
 * - Authenticated request -> 200 with resolved user identity & organization membership
 */
apiRouter.get('/auth/health', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  return res.json({
    status: 'authenticated',
    authenticated: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
    },
    organization: {
      id: req.organization!.id,
      name: req.organization!.name,
      role: req.membership!.role,
    },
    timestamp: new Date().toISOString(),
  });
});
apiRouter.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const orgs = await getUserOrganizations(user.id);
    const orgId = (req.headers['x-organization-id'] as string) || orgs[0]?.id;
    const workspace = await getWorkspaceSnapshot(user.id, orgId);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch session.';
    console.error('Me endpoint error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const updated = await updateUserProfile(req.user!.id, { name, avatarUrl });
    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile.';
    console.error('Profile update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/workspace', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const workspace = await getWorkspaceSnapshot(req.user!.id, orgId);
    return res.json(workspace);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch workspace.';
    console.error('Workspace fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgs = await getUserOrganizations(req.user!.id);
    return res.json(orgs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch organizations.';
    console.error('Organizations fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required.' });
    const { organization, membership } = await createOrganizationForUser(req.user!, name);
    return res.status(201).json({ organization, membership });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create organization.';
    console.error('Organization creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/organizations/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, timezone, currency } = req.body;
    const updated = await updateOrganization(req.organizationId!, { name, timezone, currency });
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update organization.';
    console.error('Organization update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   CLIENTS API (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/clients', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const clients = await getClients(req.organizationId!);
    return res.json(clients);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch clients.';
    console.error('Clients fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/clients', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, companyName, relationshipType, notes } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Client name and email are required.' });
    }

    const client = await createClient(req.organizationId!, {
      name,
      email,
      companyName: companyName || name,
      relationshipType: relationshipType || 'REGULAR',
      paymentReliabilityScore: 85,
      averagePaymentDelayDays: 0,
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      neverContact: false,
      notes,
    });

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'CLIENT_CREATED',
      entityType: 'CLIENT',
      entityId: client.id,
      message: `Added client ${client.name} (${client.companyName}).`,
    });

    return res.status(201).json(client);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create client.';
    console.error('Client creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateClient(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update client.';
    console.error('Client update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.delete('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await getClientById(req.organizationId!, req.params.id);
    await deleteClient(req.organizationId!, req.params.id);

    if (client) {
      await createAuditLog(req.organizationId!, {
        userId: req.user!.id,
        eventType: 'CLIENT_DELETED',
        entityType: 'CLIENT',
        entityId: req.params.id,
        message: `Deleted client ${client.name}.`,
      });
    }

    return res.json({ success: true, message: 'Client deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete client.';
    console.error('Client deletion error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   INVOICES API (Tenant Scoped & Protected)
------------------------------------------------------------- */
apiRouter.get('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const invoices = await getInvoices(req.organizationId!);
    return res.json(invoices);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch invoices.';
    console.error('Invoices fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      companyName,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      clientId,
      notes,
    } = req.body;

    if (!invoiceNumber || !clientName || !clientEmail || invoiceAmount === undefined) {
      return res.status(400).json({
        error: 'Invoice number, client name, client email, and amount are required.',
      });
    }

    const invoice = await createInvoice(req.organizationId!, {
      clientId: clientId || undefined,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      companyName: companyName ? companyName.trim() : undefined,
      invoiceNumber: invoiceNumber.trim(),
      invoiceAmount: Number(invoiceAmount),
      currency: currency || 'INR',
      invoiceDate,
      dueDate,
      notes,
    });

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      message: `Created invoice #${invoice.invoiceNumber} for ${invoice.clientName} (${invoice.currency} ${invoice.invoiceAmount.toLocaleString()}).`,
    });

    return res.status(201).json(invoice);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create invoice.';
    console.error('Invoice creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      clientName,
      clientEmail,
      companyName,
      invoiceNumber,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      notes,
      clientId,
    } = req.body;

    const updated = await updateInvoice(req.organizationId!, req.params.id, {
      clientName,
      clientEmail,
      companyName,
      invoiceNumber,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      notes,
      clientId,
    });
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update invoice.';
    console.error('Invoice update error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.delete('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const inv = await getInvoiceById(req.organizationId!, req.params.id);
    await deleteInvoice(req.organizationId!, req.params.id);

    if (inv) {
      await createAuditLog(req.organizationId!, {
        userId: req.user!.id,
        eventType: 'INVOICE_DELETED',
        entityType: 'INVOICE',
        entityId: req.params.id,
        message: `Deleted invoice #${inv.invoiceNumber}.`,
      });
    }

    return res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete invoice.';
    console.error('Invoice deletion error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/mark-paid', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paidInvoice = await markInvoicePaid(req.organizationId!, req.params.id);

    return res.json({
      success: true,
      invoice: paidInvoice,
      message: `Invoice #${paidInvoice.invoiceNumber} recorded as PAID. Reminders halted.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark invoice as paid.';
    console.error('Mark paid error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/pause', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paused = await pauseInvoice(req.organizationId!, req.params.id);
    return res.json(paused);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to pause reminders.';
    console.error('Pause invoice error:', err);
    return res.status(400).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/resume', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const resumed = await resumeInvoice(req.organizationId!, req.params.id);
    return res.json(resumed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resume reminders.';
    console.error('Resume invoice error:', err);
    return res.status(400).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/dispute', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { disputed } = req.body;
    const result = await disputeInvoice(req.organizationId!, req.params.id, disputed !== false);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispute invoice.';
    console.error('Dispute invoice error:', err);
    return res.status(400).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   REMINDERS API (Tenant Scoped & Safeguarded)
------------------------------------------------------------- */
apiRouter.get('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const reminders = await getReminders(req.organizationId!);
    return res.json(reminders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch reminders.';
    console.error('Reminders fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId, clientId, sequenceNumber, scheduledAt, tone, subject, body } = req.body;
    if (!invoiceId || !subject || !body) {
      return res.status(400).json({ error: 'Invoice ID, subject, and body are required.' });
    }

    const reminder = await createReminder(req.organizationId!, {
      invoiceId,
      clientId,
      sequenceNumber: (Number(sequenceNumber || 1) as 1 | 2 | 3) || 1,
      scheduledAt: scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      tone: tone || 'PROFESSIONAL',
      subject,
      body,
      aiGenerated: true,
      requiresReview: true,
    });

    return res.status(201).json(reminder);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create reminder.';
    const status = err instanceof Error && 'status' in err && typeof (err as Error & { status?: number }).status === 'number'
      ? (err as Error & { status?: number }).status!
      : 400;
    console.error('Reminder creation error:', err);
    return res.status(status).json({ error: msg });
  }
});

apiRouter.patch('/reminders/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { scheduledAt, tone, subject, body, requiresReview } = req.body;

    const updated = await updateReminder(req.organizationId!, req.params.id, {
      scheduledAt,
      tone,
      subject,
      body,
      requiresReview,
    });
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update reminder draft.';
    console.error('Reminder update error:', err);
    return res.status(400).json({ error: msg });
  }
});

const handleApproveReminder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderEmail = req.user?.email || 'accounts@yourbusiness.com';
    const sent = await approveAndSendReminder(req.organizationId!, req.params.id, senderEmail);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'REMINDER_SENT',
      entityType: 'REMINDER',
      entityId: sent.id,
      message: `Approved and sent payment reminder (Sequence #${sent.sequenceNumber}) for invoice ${sent.invoiceId}.`,
    });

    return res.json(sent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send reminder.';
    const code = err instanceof Error && 'code' in err ? (err as Error & { code?: string }).code : undefined;
    console.error('Approve reminder error:', err);
    if (code === 'INTEGRATION_REQUIRED') {
      return res.status(422).json({ error: msg, code });
    }
    return res.status(400).json({ error: msg });
  }
};

apiRouter.post('/reminders/:id/approve', requireAuth, requireOrgMember, handleApproveReminder);
apiRouter.post('/reminders/:id/approve-and-send', requireAuth, requireOrgMember, handleApproveReminder);

apiRouter.post('/reminders/:id/cancel', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const cancelled = await cancelReminder(req.organizationId!, req.params.id, reason || 'Cancelled by user');
    return res.json(cancelled);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel reminder.';
    console.error('Cancel reminder error:', err);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   AI REMINDER GENERATION (Server-Side, Tenant-Scoped & Fact-Verified)
------------------------------------------------------------- */
apiRouter.post('/gemini/generate-reminder', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      invoiceId,
      sequenceNumber,
      communicationStyle,
      customInstructions,
    } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'invoiceId is required to generate a verified reminder draft.',
      });
    }

    // Authoritatively resolve invoice from database
    const invoice = await getInvoiceById(req.organizationId!, invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in your organization.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot generate reminders for an invoice that is already PAID.' });
    }

    if (invoice.status === 'DISPUTED') {
      return res.status(400).json({ error: 'Cannot generate reminders for a DISPUTED invoice. Please resolve dispute first.' });
    }

    const targetSeq = (Number(sequenceNumber) as 1 | 2 | 3) || 1;
    if (![1, 2, 3].includes(targetSeq)) {
      return res.status(400).json({ error: 'Sequence number must be 1, 2, or 3.' });
    }

    let targetRelationship = 'REGULAR';
    if (invoice.clientId) {
      const client = await getClientById(req.organizationId!, invoice.clientId);
      if (client) {
        targetRelationship = client.relationshipType || 'REGULAR';
      }
    }

    const draft = await generateReminderDraft({
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      companyName: invoice.companyName || 'Our Business',
      amountFormatted: `${invoice.currency} ${invoice.invoiceAmount.toLocaleString('en-IN')}`,
      dueDateFormatted: invoice.dueDate,
      daysOverdue: invoice.daysOverdue,
      sequenceNumber: targetSeq,
      relationshipType: targetRelationship as RelationshipType,
      tone: communicationStyle || 'PROFESSIONAL',
      customInstructions: customInstructions ? String(customInstructions).slice(0, 500) : undefined,
    });

    return res.json(draft);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI Generation failed.';
    console.error('Gemini generation endpoint error:', err);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   EVENTS, LOGS & CONNECTIONS (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/email-events', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const events = await getEmailEvents(req.organizationId!);
    return res.json(events);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch email events.';
    console.error('Email events fetch error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/audit-logs', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await getAuditLogs(req.organizationId!);
    return res.json(logs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch audit logs.';
    console.error('Audit logs fetch error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/connections', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const connections = await getConnections(req.organizationId!);
    return res.json(connections);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch connections.';
    console.error('Connections fetch error:', err);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   GMAIL OAUTH & INTEGRATION ENDPOINTS (IC-V1.0.4)
------------------------------------------------------------- */

/**
 * Initiates the Google OAuth 2.0 flow for Gmail read-only access.
 * Enforces organization tenant boundaries and sets a signed CSRF state cookie.
 */
apiRouter.get('/connections/gmail/connect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    validateGoogleOAuthConfig();

    const state = createSignedOAuthState(req.user!.id, req.organizationId!);

    // Store state in a secure, short-lived httpOnly cookie to prevent CSRF
    res.cookie('ic_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    const authUrl = generateGmailAuthUrl(state);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_CONNECTED',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: 'Initiated Google OAuth authorization flow for Gmail.',
    });

    if (req.query.redirect === 'true') {
      return res.redirect(authUrl);
    }

    return res.json({ authUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to initiate Gmail connection.';
    console.error('Gmail connect error:', err);
    return res.status(400).json({ error: msg });
  }
});

/**
 * Handles the Google OAuth 2.0 redirect callback.
 * Validates CSRF state, exchanges code for tokens, encrypts tokens, and updates DB.
 */
apiRouter.get('/connections/gmail/callback', async (req, res) => {
  const { code, state, error: googleError } = req.query;

  const cookieState = req.cookies?.ic_oauth_state;
  // Clear the state cookie immediately
  res.clearCookie('ic_oauth_state', { path: '/' });

  if (googleError) {
    console.warn('Google OAuth returned error:', googleError);
    return res.redirect(`/app/connections?error=${encodeURIComponent(String(googleError))}`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect('/app/connections?error=invalid_oauth_response');
  }

  // Verify signed state parameter
  let statePayload;
  try {
    statePayload = verifySignedOAuthState(state);
  } catch (stateErr: unknown) {
    const msg = stateErr instanceof Error ? stateErr.message : 'OAuth state verification failed';
    console.error('Invalid OAuth state:', msg);
    return res.redirect(`/app/connections?error=${encodeURIComponent(msg)}`);
  }

  // Cross-check with cookie state if cookie is present
  if (cookieState && cookieState !== state) {
    console.error('OAuth state mismatch between cookie and callback parameter.');
    return res.redirect('/app/connections?error=csrf_state_mismatch');
  }

  const { organizationId, userId } = statePayload;

  try {
    const { accountEmail } = await handleGmailOAuthCallback(organizationId, code);

    await createAuditLog(organizationId, {
      userId,
      eventType: 'INTEGRATION_CONNECTED',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: `Successfully connected Gmail account: ${accountEmail}`,
    });

    return res.redirect('/app/connections?connected=gmail');
  } catch (exchangeErr: unknown) {
    const msg = exchangeErr instanceof Error ? exchangeErr.message : 'Failed to complete Google OAuth exchange';
    console.error('Gmail OAuth exchange error:', exchangeErr);
    return res.redirect(`/app/connections?error=${encodeURIComponent(msg)}`);
  }
});

/**
 * Live connection health check:
 * Calls Gmail API `users.getProfile` to verify active OAuth authorization.
 */
apiRouter.get('/connections/gmail/test', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await testGmailConnection(req.organizationId!);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_SYNCED',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: `Verified Gmail API connectivity for account: ${result.email}`,
    });

    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to test Gmail connection.';
    console.error('Gmail test error:', err);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_ERROR',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: `Gmail connection test failed: ${msg}`,
    });

    return res.status(400).json({ error: msg });
  }
});

/**
 * Live Gmail message reader (read-only verification test):
 * Reads up to 5-10 recent email headers & safe snippets to prove read-only access.
 */
apiRouter.get('/connections/gmail/messages', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const messages = await getRecentGmailMessages(req.organizationId!, limit);
    return res.json({ messages });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Gmail messages.';
    console.error('Gmail messages fetch error:', err);
    return res.status(400).json({ error: msg });
  }
});

/**
 * Disconnects Gmail integration and revokes OAuth tokens.
 */
apiRouter.delete('/connections/gmail', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await disconnectGmailIntegration(req.organizationId!);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_DISCONNECTED',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: 'Disconnected Gmail integration account.',
    });

    return res.json({ success: true, status: 'DISCONNECTED' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disconnect Gmail.';
    console.error('Gmail disconnect error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/connections/gmail/disconnect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await disconnectGmailIntegration(req.organizationId!);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_DISCONNECTED',
      entityType: 'INTEGRATION',
      entityId: 'GMAIL',
      message: 'Disconnected Gmail integration account.',
    });

    return res.json({ success: true, status: 'DISCONNECTED' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disconnect Gmail.';
    console.error('Gmail disconnect error:', err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/connections/:provider/connect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  const provider = req.params.provider?.toUpperCase();
  if (provider === 'GMAIL') {
    return res.redirect('/api/connections/gmail/connect');
  }
  return res.status(501).json({
    error: 'Google Sheets live sync not implemented in this version.',
    code: 'INTEGRATION_NOT_IMPLEMENTED',
  });
});

apiRouter.post('/connections/connect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  const provider = req.body.provider?.toUpperCase();
  if (provider === 'GMAIL') {
    return res.redirect('/api/connections/gmail/connect');
  }
  return res.status(501).json({
    error: 'Google Sheets live sync not implemented in this version.',
    code: 'INTEGRATION_NOT_IMPLEMENTED',
  });
});

apiRouter.post('/connections/sync', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  return res.status(501).json({
    error: 'Integration synchronization not implemented.',
    code: 'INTEGRATION_NOT_IMPLEMENTED',
  });
});

apiRouter.post('/invoices/import-sheets', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  return res.status(501).json({
    error: 'Google Sheets import not implemented in this version.',
    code: 'INTEGRATION_NOT_IMPLEMENTED',
  });
});

apiRouter.post('/connections/:provider/disconnect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as 'GMAIL' | 'GOOGLE_SHEETS';
    if (provider === 'GMAIL') {
      await disconnectGmailIntegration(req.organizationId!);
    } else {
      await disconnectConnection(req.organizationId!, provider);
    }

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_DISCONNECTED',
      entityType: 'INTEGRATION',
      entityId: provider,
      message: `Disconnected ${provider} integration account.`,
    });

    return res.json({ success: true, status: 'DISCONNECTED' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disconnect integration.';
    console.error('Disconnect error:', err);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   SETTINGS & BILLING (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/settings/automation', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAutomationSettings(req.organizationId!);
    return res.json(settings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch automation settings.';
    console.error('Automation settings fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/settings/automation', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAutomationSettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update automation settings.';
    console.error('Automation settings update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/settings/ai', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAISettings(req.organizationId!);
    return res.json(settings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch AI settings.';
    console.error('AI settings fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/settings/ai', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAISettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update AI settings.';
    console.error('AI settings update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

const handleUpgradePlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'Plan is required.' });

    const updated = await updateSubscriptionPlan(req.organizationId!, plan);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'SUBSCRIPTION_UPGRADED',
      entityType: 'SUBSCRIPTION',
      entityId: updated.id,
      message: `Upgraded subscription tier to ${plan}.`,
    });

    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update subscription.';
    console.error('Upgrade plan error:', msg);
    return res.status(500).json({ error: msg });
  }
};

apiRouter.post('/billing/upgrade', requireAuth, requireOrgMember, handleUpgradePlan);
apiRouter.post('/billing/upgrade-plan', requireAuth, requireOrgMember, handleUpgradePlan);

/* -------------------------------------------------------------
   NOTIFICATIONS API (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/notifications', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await getNotifications(req.organizationId!);
    return res.json(notifications);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notifications.';
    console.error('Notifications fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

const handleMarkNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await markNotificationRead(req.organizationId!, req.params.id);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark notification as read.';
    console.error('Mark read error:', msg);
    return res.status(500).json({ error: msg });
  }
};

apiRouter.post('/notifications/:id/read', requireAuth, requireOrgMember, handleMarkNotificationRead);
apiRouter.patch('/notifications/:id/read', requireAuth, requireOrgMember, handleMarkNotificationRead);

const handleMarkAllNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await markAllNotificationsRead(req.organizationId!);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark all notifications as read.';
    console.error('Mark all read error:', msg);
    return res.status(500).json({ error: msg });
  }
};

apiRouter.post('/notifications/mark-all-read', requireAuth, requireOrgMember, handleMarkAllNotificationsRead);
apiRouter.post('/notifications/read-all', requireAuth, requireOrgMember, handleMarkAllNotificationsRead);
