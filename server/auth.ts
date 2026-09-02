import { Request, Response, NextFunction } from 'express';
import { getSupabase } from './supabase';
import { findUserById, upsertUserRecord, getUserMembership, getOrganizationById, getUserOrganizations } from './db';
import { User, Membership, Organization } from '../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  membership?: Membership;
  organization?: Organization;
  organizationId?: string;
}

/**
 * Middleware: Requires a valid authenticated Supabase user session.
 * Uses Supabase Auth to cryptographically verify the access token.
 * Never trusts user-supplied IDs from client payloads.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.ic_token) {
      token = req.cookies.ic_token;
    } else if (req.cookies && req.cookies.sb_token) {
      token = req.cookies.sb_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired Supabase session. Please log in again.' });
    }

    const authUser = data.user;

    // Fetch or ensure the user profile in public.users
    let user = await findUserById(authUser.id);
    if (!user) {
      const name =
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split('@')[0] : 'User');
      user = await upsertUserRecord({
        id: authUser.id,
        email: authUser.email || '',
        name,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Authentication check failed.';
    console.error('Auth middleware error:', errorMsg);
    return res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

/**
 * Middleware: Resolves tenant organization & verifies membership.
 * Never trusts unauthenticated or cross-tenant organization IDs.
 */
export async function requireOrgMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User must be authenticated.' });
    }

    // Determine target organization from header, query, or body
    const headerOrgId = req.headers['x-organization-id'] as string;
    const bodyOrgId = req.body?.organizationId as string;
    const queryOrgId = req.query?.organizationId as string;
    let targetOrgId = headerOrgId || queryOrgId || bodyOrgId;

    if (!targetOrgId) {
      // If none provided in request, resolve first organization membership for user
      const userOrgs = await getUserOrganizations(req.user.id);
      if (userOrgs && userOrgs.length > 0) {
        targetOrgId = userOrgs[0].id;
      } else {
        return res.status(400).json({ error: 'Target organization ID is required.' });
      }
    }

    // Verify user is a member of target organization
    const membership = await getUserMembership(req.user.id, targetOrgId);
    if (!membership) {
      return res.status(403).json({
        error: 'Access denied. You do not belong to this organization.',
      });
    }

    const org = await getOrganizationById(targetOrgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    req.membership = membership;
    req.organization = org;
    req.organizationId = org.id;

    next();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Org verification failed.';
    console.error('Org member verification error:', errorMsg);
    return res.status(500).json({ error: 'Organization authorization failed.' });
  }
}
