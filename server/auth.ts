import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById, getUserMembership, getOrganizationById, UserRecord } from './db';
import { Membership, Organization } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'invoicechaser-ai-production-secret-2026';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  membership?: Membership;
  organization?: Organization;
  organizationId?: string;
}

export function signAuthToken(user: { id: string; email: string }): string {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Requires a valid authenticated user session.
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
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

/**
 * Middleware: Resolves tenant organization & verifies membership.
 * Never trusts unauthenticated or arbitrary organization IDs.
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
    const targetOrgId = headerOrgId || queryOrgId || bodyOrgId;

    if (!targetOrgId) {
      // If none provided in request, resolve first membership of user
      const membership = await getUserMembership(req.user.id, targetOrgId || '');
      if (!membership) {
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
  } catch (err) {
    console.error('Org member verification error:', err);
    return res.status(500).json({ error: 'Organization authorization failed.' });
  }
}
