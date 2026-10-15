import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Connect } from 'vite';
import { requireGatewayOriginFromEnv } from '../shared/gatewayOrigin.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../../vitafy-backend');

type BuildEncryptedAuthorizeParams = (input: {
  tenantId: string;
  jwtPublicKeyPem: string;
  state: string;
  codeChallenge: string;
}) => { tenant_id: string; authorize_envelope: string };

/** Vite keeps a stale require() cache of @vitafy/core after backend updates. */
function loadBuildEncryptedAuthorizeParams(): BuildEncryptedAuthorizeParams {
  const modulePaths = [
    path.join(backendRoot, 'scripts/integration/lib/shared.mjs'),
    path.join(backendRoot, 'packages/core/dist/app/integration/index.js'),
    path.join(backendRoot, 'packages/core/dist/app/integration/crypto/partner-authorize-envelope.js'),
  ];
  for (const file of modulePaths) {
    try {
      delete require.cache[require.resolve(file)];
    } catch {
      /* not loaded yet */
    }
  }
  const mod = require(
    path.join(backendRoot, 'scripts/integration/lib/shared.mjs')
  ) as { buildEncryptedAuthorizeParams: BuildEncryptedAuthorizeParams };
  return mod.buildEncryptedAuthorizeParams;
}

const { verifyVitafyIntegrationJwt } = require('../shared/jwtRs256Verify.mjs') as {
  verifyVitafyIntegrationJwt: (
    token: string,
    pem: string,
    options?: { tenantId?: string; audience?: string; issuer?: string }
  ) => Record<string, unknown>;
};

function readTenantId(env: Record<string, string>): string {
  const tenantId = (env.VITE_TENANT_ID ?? '').trim();
  if (!tenantId) {
    throw new Error('VITE_TENANT_ID is required');
  }
  return tenantId;
}

function normalizeJwtPublicKeyPem(raw: string): string {
  const normalized = raw.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
  const match = normalized.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/);
  if (!match) {
    throw new Error('JWT public key is not a valid PEM');
  }
  return match[0];
}

function readJwtPublicKey(env: Record<string, string>): string {
  const raw = (env.VITE_JWT_PUBLIC_KEY ?? '').trim();
  if (!raw) {
    throw new Error('VITE_JWT_PUBLIC_KEY is required (run npm run integration:sync-partner-env in vitafy-backend)');
  }
  return normalizeJwtPublicKeyPem(raw);
}

const DEFAULT_REQUEST_APP = 'vitafyhealth';

function readRequestApp(env: Record<string, string>): string {
  return (env.VITE_REQUEST_APP ?? DEFAULT_REQUEST_APP).trim() || DEFAULT_REQUEST_APP;
}

async function fetchVitafySsoLoginUrl(
  gatewayOrigin: string,
  tenantId: string,
  requestApp: string
): Promise<string> {
  const configUrl = `${gatewayOrigin.replace(/\/$/, '')}/api/tenants/${encodeURIComponent(tenantId)}/integration-settings/integration-configuration`;
  const response = await fetch(configUrl, {
    headers: { requestapp: requestApp },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      text.trim() || `Failed to load tenant integration configuration (${response.status})`
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Tenant integration configuration response was not JSON');
  }

  const root = body as Record<string, unknown>;
  const config = (root.data ?? root) as Record<string, unknown>;
  const ssoLoginUrl = config.vitafySsoLoginUrl;
  if (typeof ssoLoginUrl !== 'string' || !ssoLoginUrl.trim()) {
    throw new Error('Tenant integrationConfiguration.vitafySsoLoginUrl is missing');
  }
  return ssoLoginUrl.trim().replace(/\/$/, '');
}

function formatHandlerError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

function readJsonBody(req: Connect.IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, string>) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function createPartnerAuthApiMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  const tenantId = readTenantId(env);
  const jwtPublicKey = readJwtPublicKey(env);
  const gatewayOrigin = requireGatewayOriginFromEnv(env.VITE_GATEWAY_ORIGIN);
  const requestApp = readRequestApp(env);
  const tokenUrl = `${gatewayOrigin}/integrations/oauth/token`;
  const defaultAudience = (env.VITE_INTEGRATION_TOKEN_AUDIENCE ?? 'vitafy-integration-api').trim();

  return async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';

    if (url === '/auth/vitafy/authorize-url' && req.method === 'GET') {
      try {
        const query = new URL(req.url ?? '', 'http://localhost').searchParams;
        const state = query.get('state')?.trim();
        const codeChallenge = query.get('code_challenge')?.trim();
        if (!state || !codeChallenge) {
          res.statusCode = 400;
          res.end('state and code_challenge query params are required');
          return;
        }
        if (state.length > 512 || codeChallenge.length > 256) {
          res.statusCode = 400;
          res.end('state or code_challenge is too long');
          return;
        }
        const vitafySsoLoginUrl = await fetchVitafySsoLoginUrl(
          gatewayOrigin,
          tenantId,
          requestApp
        );
        const buildEncryptedAuthorizeParams = loadBuildEncryptedAuthorizeParams();
        const encrypted = buildEncryptedAuthorizeParams({
          tenantId,
          jwtPublicKeyPem: jwtPublicKey,
          state,
          codeChallenge,
        });
        const loginUrl = new URL(`${vitafySsoLoginUrl}/`);
        loginUrl.searchParams.set('tenant_id', encrypted.tenant_id);
        loginUrl.searchParams.set('state', state);
        loginUrl.searchParams.set('code_challenge', codeChallenge);
        loginUrl.searchParams.set('authorize_envelope', encrypted.authorize_envelope);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ authorizeUrl: loginUrl.toString() }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(formatHandlerError(error));
      }
      return;
    }

    if (url !== '/auth/vitafy/token' || req.method !== 'POST') {
      next();
      return;
    }

    try {
      const body = await readJsonBody(req);
      const code = body.code?.trim();
      const codeVerifier = body.code_verifier?.trim();
      if (!code || !codeVerifier) {
        res.statusCode = 400;
        res.end('code and code_verifier are required');
        return;
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        tenant_id: tenantId,
        code_verifier: codeVerifier,
      });

      const vitafyResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await vitafyResponse.text();
      if (!vitafyResponse.ok) {
        res.statusCode = vitafyResponse.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(text);
        return;
      }

      const tokens = JSON.parse(text) as { access_token?: string };
      if (!tokens.access_token) {
        res.statusCode = 502;
        res.end('Token response missing access_token');
        return;
      }

      verifyVitafyIntegrationJwt(tokens.access_token, jwtPublicKey, {
        tenantId,
        audience: defaultAudience,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(text);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(formatHandlerError(error));
    }
  };
}
