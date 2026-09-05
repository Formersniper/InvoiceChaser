import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { apiRouter, getAuthCookieOptions, ensureUserWorkspace } from './server/routes/api';
import { getSupabase } from './server/supabase';

dotenv.config();

const app = express();
const PORT = 3000;

// Respect Cloud Run and nginx reverse proxy HTTPS headers
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

// Healthcheck endpoints for Cloud Run / GCP load balancers
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Mount the multi-tenant API routes
app.use('/api', apiRouter);

// Server-Authoritative Supabase Google OAuth Callback Handler
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error, error_description } = req.query;

  // 1. Safe error handling: never display raw provider errors or leak sensitive tokens
  if (error) {
    console.error('OAuth provider callback reported error:', typeof error_description === 'string' ? error_description : error);
    const safeError = error === 'access_denied' ? 'cancelled' : 'oauth_failed';
    return res.redirect(`/login?error=${encodeURIComponent(safeError)}`);
  }

  // 2. Server-side code exchange
  if (typeof code === 'string' && code.trim()) {
    try {
      const supabase = getSupabase();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code.trim());

      if (exchangeError || !data?.session || !data?.user) {
        console.error('Failed to exchange OAuth code for session:', exchangeError?.message || 'Missing session');
        return res.redirect('/login?error=auth_failed');
      }

      const { user, session } = data;

      const googleName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'User');

      const googleAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName)}`;

      // Authoritative workspace & profile provisioning in database
      await ensureUserWorkspace({
        id: user.id,
        email: user.email || '',
        name: googleName,
        avatarUrl: googleAvatar,
        companyName: user.user_metadata?.companyName,
      });

      // Issue authoritative httpOnly session cookies
      const cookieOpts = getAuthCookieOptions(req);
      res.cookie('ic_token', session.access_token, cookieOpts);
      res.cookie('sb_token', session.access_token, cookieOpts);

      // Clean HTML redirect that works for both popup windows and direct full-page redirects
      // ZERO tokens are exposed in postMessage or the URL!
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <script>
    (function() {
      // Remove any query params or hashes from URL immediately
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '/app/dashboard');
      }
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'AUTH_SUCCESS' }, window.location.origin);
          setTimeout(function() { window.close(); }, 300);
          return;
        } catch (e) {}
      }
      window.location.replace('/app/dashboard');
    })();
  </script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdfaf5;">
  <p style="color:#3c473a;font-size:14px;font-weight:600;">Completing sign in...</p>
</body>
</html>`);
    } catch (err: unknown) {
      console.error('OAuth callback execution error:', err instanceof Error ? err.message : 'Unknown error');
      return res.redirect('/login?error=auth_failed');
    }
  }

  // If accessed directly or with legacy implicit hash, redirect cleanly
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '/login');
    }
    window.location.replace('/login');
  </script>
</head>
<body></body>
</html>`);
});


// Vite / Static Files Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceChaser AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
