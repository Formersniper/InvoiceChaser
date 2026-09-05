import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { apiRouter } from './server/routes/api';

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

// Supabase Google OAuth Callback Handler
// Serves lightweight HTML that communicates credentials via postMessage to opener popup or forwards to SPA
app.get(['/auth/callback', '/auth/callback/'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InvoiceChaser — Completing Authentication</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #fdfaf5;
      color: #3c473a;
    }
    .card {
      text-align: center;
      padding: 36px 28px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.08);
      max-width: 360px;
      width: 90%;
    }
    .badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #3c473a;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(60, 71, 58, 0.25);
    }
    h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
    }
    p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .spinner {
      border: 3px solid #f1f5f9;
      border-top: 3px solid #3c473a;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      animation: spin 0.8s linear infinite;
      margin: 20px auto 0;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">IC</div>
    <h3>Connecting your Google Account</h3>
    <p>Completing secure Supabase authentication…</p>
    <div class="spinner"></div>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'SUPABASE_OAUTH_CALLBACK',
            hash: hash,
            search: search
          }, '*');
          setTimeout(function() {
            window.close();
          }, 600);
        } else {
          // Top-level navigation: forward tokens into SPA hash route
          var targetHash = '#/auth/callback' + (hash ? ('&' + hash.replace(/^#/, '')) : '') + (search ? ('&' + search.replace(/^\\?/, '')) : '');
          window.location.href = '/' + targetHash;
        }
      } catch (err) {
        console.error('Callback forwarding error:', err);
      }
    })();
  </script>
</body>
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
