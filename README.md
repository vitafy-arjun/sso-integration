# Vitafy partner OAuth demo

| Variable | Meaning |
|----------|---------|
| `VITE_GATEWAY_ORIGIN` | Vitafy gateway host for dev proxy + token exchange (`http://localhost:3000`) |
| `VITE_TENANT_ID` | Vitafy tenant UUID |
| `VITE_JWT_PUBLIC_KEY` | Tenant `jwtPublicKey` PEM (encrypt authorize + verify tokens) |

Vitafy SSO login URL is read from `GET /api/tenants/{tenantId}/integration-settings/integration-configuration` (`vitafySsoLoginUrl` on the tenant), not from `.env`.

Redirect URI: `{origin}/auth/vitafy/callback` (must match tenant `oauthRedirectUri`, e.g. `http://localhost:5173/...`).

```bash
npm install
cp .env.example .env
# From vitafy-backend: npm run integration:dev-seed && npm run integration:sync-partner-env
npm run dev
```

Flow: dev server builds **encrypted** `authorize_envelope` → popup → sso-host login → callback → `POST /auth/vitafy/token` (verifies JWT) → UI.

See `vitafy-backend` `integration:verify`, `integration:verify-authorize-envelope:unit`.

## Deploy on Vercel

This app is not static-only: production needs serverless routes for `/auth/vitafy/*` and a proxy for `/integrations/*` (see `vercel.json` + `api/`).

1. In the Vercel project **Environment Variables**, set (for Production and Preview):

   - `VITE_GATEWAY_ORIGIN` — e.g. `https://qa-api-v3.vitafyhealth.com`
   - `VITE_TENANT_ID`
   - `VITE_JWT_PUBLIC_KEY` — PEM with `\n` for newlines (same as local `.env`)

2. Update the tenant **`oauthRedirectUri`** in Vitafy to your deployed callback, e.g.  
   `https://your-app.vercel.app/auth/vitafy/callback`  
   (must match exactly, including https and no trailing slash unless configured that way).

3. Redeploy after changing env vars (Vite bakes `VITE_TENANT_ID` into the client at build time).

Local dev still uses the Vite dev server middleware; Vercel uses the `api/` handlers with the same logic.
