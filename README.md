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
