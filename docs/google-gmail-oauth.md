# Google Gmail OAuth 2.0 Setup Guide (IC-V1.0.4)

This guide documents the configuration and architecture for the production-grade **Google Gmail OAuth 2.0** integration in **InvoiceChaser**.

---

## 1. Scope & Capabilities

InvoiceChaser requests the minimal necessary permission to detect invoices in the connected inbox:

- **Scope**: `https://www.googleapis.com/auth/gmail.readonly`
- **Access Type**: `offline` (receives a refresh token for background synchronization)
- **Prompt**: `consent` with `access_type=offline`
- **Isolation**: Tenant-scoped per organization (`UNIQUE(organization_id, provider)`)

> **Security Note**: No email sending (`gmail.send`) or mailbox modification scopes are requested or permitted in this release. All tokens are encrypted at rest using AES-256-GCM.

---

## 2. Google Cloud Console Configuration

### Step A: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select your existing InvoiceChaser project.

### Step B: Enable the Gmail API
1. Go to **APIs & Services > Library**.
2. Search for **Gmail API**.
3. Click **Enable**.

### Step C: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (or **Internal** if using Google Workspace for your own organization only).
3. Fill in the App Information:
   - **App name**: `InvoiceChaser`
   - **User support email**: Your support email.
   - **Developer contact email**: Your engineering email.
4. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
5. On the **Test users** page (if in Testing mode), add any Google accounts you will use for testing.

### Step D: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Application type**: `Web application`.
4. Name: `InvoiceChaser Web Client`.
5. Under **Authorized redirect URIs**, add your application's callback URL:
   - **Production**: `https://your-domain.com/api/connections/gmail/callback`
   - **Local Development**: `http://localhost:3000/api/connections/gmail/callback`
6. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 3. Environment Variables Configuration

Add the following environment variables to your server configuration (`.env` or Cloud Run environment):

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/connections/gmail/callback

# 32-Byte Hex or Base64 Encryption Key for AES-256-GCM Token Storage
# Generate one using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GOOGLE_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

## 4. Security Architecture

### A. AES-256-GCM Token Encryption at Rest
- Tokens (both `access_token` and `refresh_token`) are encrypted on the server before database insertion using AES-256-GCM (`server/crypto.ts`).
- Storage format: `iv:authTag:encryptedCiphertext` in hexadecimal strings.
- Neither raw tokens nor encryption keys are ever sent to the browser or returned in API responses.

### B. CSRF Protection & Signed State
- When `/api/connections/gmail/connect` is called:
  - A cryptographically signed state token (HMAC-SHA256) is generated containing `organizationId`, `userId`, `nonce`, and `expiresAt` (10 minutes).
  - A secure `httpOnly` state cookie (`ic_oauth_state`) is written.
- When Google redirects to `/api/connections/gmail/callback`:
  - The signed state is verified with the secret key and compared against the `httpOnly` cookie to completely eliminate CSRF vulnerabilities.
  - The target organization is securely extracted from the verified state payload.

### C. Automatic Token Refresh
- `server/gmail.ts` utilizes `google.auth.OAuth2` with credentials loaded dynamically from the database.
- An automatic `tokens` event listener re-encrypts and persists updated tokens to the database whenever Google rotates the access token.

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/connections/gmail/connect` | Generates signed OAuth authorization URL and sets state cookie |
| `GET` | `/api/connections/gmail/callback` | Exchanges authorization code, encrypts tokens, and saves connection |
| `GET` | `/api/connections/gmail/test` | Tests live Gmail API connection using encrypted credentials |
| `GET` | `/api/connections/gmail/messages` | Fetches recent read-only message summaries to verify inbox access |
| `DELETE` / `POST` | `/api/connections/gmail/disconnect` | Revokes Google token and removes encrypted credentials |

---

## 6. Troubleshooting

- **`redirect_uri_mismatch`**: Verify that `GOOGLE_REDIRECT_URI` matches exactly with the Authorized Redirect URI listed in Google Cloud Console, including protocol (`http://` vs `https://`) and port.
- **`access_denied`**: The user canceled the consent dialog.
- **`invalid_grant`**: The refresh token was revoked or expired. Click **Reconnect Gmail** in the UI to re-authorize.
