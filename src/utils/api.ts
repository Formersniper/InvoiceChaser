/**
 * InvoiceChaser AI - Authoritative Backend API Client
 * Sends authenticated requests to Express / Supabase backend.
 */

const TOKEN_KEY = 'ic_auth_token';
const ORG_KEY = 'ic_active_org_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Error saving auth token:', err);
  }
}

export function getStoredOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

export function setStoredOrgId(orgId: string | null) {
  try {
    if (orgId) {
      localStorage.setItem(ORG_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_KEY);
    }
  } catch (err) {
    console.error('Error saving active org ID:', err);
  }
}

interface RequestOptions extends RequestInit {
  orgId?: string;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const activeOrgId = options.orgId || getStoredOrgId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeOrgId) {
    headers['x-organization-id'] = activeOrgId;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorBody.message || errorMessage;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: <T = any>(endpoint: string, orgId?: string) =>
    apiRequest<T>(endpoint, { method: 'GET', orgId }),

  post: <T = any>(endpoint: string, body?: any, orgId?: string) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      orgId,
    }),

  patch: <T = any>(endpoint: string, body?: any, orgId?: string) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      orgId,
    }),

  delete: <T = any>(endpoint: string, orgId?: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE', orgId }),
};
