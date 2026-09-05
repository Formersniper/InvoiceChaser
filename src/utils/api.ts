/**
 * InvoiceChaser AI - Authoritative Backend API Client
 * Uses secure httpOnly session cookies for authentication.
 * No access tokens are stored in localStorage.
 */

const ORG_KEY = 'ic_active_org_id';

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

export async function apiRequest<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const activeOrgId = options.orgId || getStoredOrgId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (activeOrgId) {
    headers['x-organization-id'] = activeOrgId;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;
    let errorCode: string | undefined;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorBody.message || errorMessage;
      errorCode = errorBody.code;
    } catch {
      // ignore non-JSON error
    }
    const err = new Error(errorMessage);
    if (errorCode) Object.assign(err, { code: errorCode });
    Object.assign(err, { status: response.status });
    throw err;
  }

  return response.json();
}

export const api = {
  get: <T = unknown>(endpoint: string, orgId?: string) =>
    apiRequest<T>(endpoint, { method: 'GET', orgId }),

  post: <T = unknown>(endpoint: string, body?: unknown, orgId?: string) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      orgId,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, orgId?: string) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      orgId,
    }),

  delete: <T = unknown>(endpoint: string, orgId?: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE', orgId }),
};
