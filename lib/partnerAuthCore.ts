import { createRequire } from 'module';
import { requireGatewayOriginFromEnv } from './gatewayOrigin.js';

const require = createRequire(import.meta.url);
const { buildEncryptedAuthorizeParams } = require('./partnerAuthorizeEnvelope.mjs') as {
  buildEncryptedAuthorizeParams: (input: {
    tenantId: string;
    jwtPublicKeyPem: string;
    state: string;
    codeChallenge: string;
  }) => { tenant_id: string; authorize_envelope: string };
};
const { verifyVitafyIntegrationJwt } = require('./jwtRs256Verify.mjs') as {
  verifyVitafyIntegrationJwt: (
    token: string,
    pem: string,
    options?: { tenantId?: string; audience?: string; issuer?: string }
  ) => Record<string, unknown>;
};

export type PartnerAuthEnv = Record<string, string | undefined>;

const DEFAULT_REQUEST_APP = 'vitafyhealth';

export function partnerAuthEnvFromProcess(env: PartnerAuthEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

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
    throw new Error('VITE_JWT_PUBLIC_KEY is required');
  }
  return normalizeJwtPublicKeyPem(raw);
}

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

export function formatHandlerError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

export type PartnerAuthContext = {
  tenantId: string;
  jwtPublicKey: string;
  gatewayOrigin: string;
  requestApp: string;
  tokenUrl: string;
  defaultAudience: string;
};

export function createPartnerAuthContext(env: Record<string, string>): PartnerAuthContext {
  const tenantId = readTenantId(env);
  const jwtPublicKey = readJwtPublicKey(env);
  const gatewayOrigin = requireGatewayOriginFromEnv(env.VITE_GATEWAY_ORIGIN);
  const requestApp = readRequestApp(env);
  return {
    tenantId,
    jwtPublicKey,
    gatewayOrigin,
    requestApp,
    tokenUrl: `${gatewayOrigin}/integrations/oauth/token`,
    defaultAudience: (env.VITE_INTEGRATION_TOKEN_AUDIENCE ?? 'vitafy-integration-api').trim(),
  };
}

export async function buildAuthorizeUrlResponse(
  ctx: PartnerAuthContext,
  query: { state: string; codeChallenge: string }
): Promise<{ authorizeUrl: string }> {
  const vitafySsoLoginUrl = await fetchVitafySsoLoginUrl(
    ctx.gatewayOrigin,
    ctx.tenantId,
    ctx.requestApp
  );
  const encrypted = buildEncryptedAuthorizeParams({
    tenantId: ctx.tenantId,
    jwtPublicKeyPem: ctx.jwtPublicKey,
    state: query.state,
    codeChallenge: query.codeChallenge,
  });
  const loginUrl = new URL(`${vitafySsoLoginUrl}/`);
  loginUrl.searchParams.set('tenant_id', encrypted.tenant_id);
  loginUrl.searchParams.set('state', query.state);
  loginUrl.searchParams.set('code_challenge', query.codeChallenge);
  loginUrl.searchParams.set('authorize_envelope', encrypted.authorize_envelope);
  return { authorizeUrl: loginUrl.toString() };
}

export async function exchangeAuthorizationCode(
  ctx: PartnerAuthContext,
  body: { code: string; codeVerifier: string }
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: body.code,
    tenant_id: ctx.tenantId,
    code_verifier: body.codeVerifier,
  });

  const vitafyResponse = await fetch(ctx.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await vitafyResponse.text();
  if (!vitafyResponse.ok) {
    const err = new Error(text || `Token exchange failed (${vitafyResponse.status})`) as Error & {
      statusCode?: number;
    };
    err.statusCode = vitafyResponse.status;
    throw err;
  }

  const tokens = JSON.parse(text) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error('Token response missing access_token');
  }

  verifyVitafyIntegrationJwt(tokens.access_token, ctx.jwtPublicKey, {
    tenantId: ctx.tenantId,
    audience: ctx.defaultAudience,
  });

  return text;
}
