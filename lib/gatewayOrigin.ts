/** Strip trailing `/api` from the gateway API base URL. */
export function gatewayOriginFromApiBase(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/$/, '');
  if (!trimmed) {
    return 'http://localhost:3000';
  }
  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/api\/?$/i, '') || '';
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.origin}${path}`.replace(/\/$/, '') || url.origin;
  } catch {
    return trimmed.replace(/\/api\/?$/i, '').replace(/\/$/, '') || 'http://localhost:3000';
  }
}

export function normalizeApiBaseUrl(api: string): string {
  const trimmed = api.trim().replace(/\/$/, '');
  return trimmed.includes('/api') ? trimmed : `${trimmed}/api`;
}

export function resolveGatewayOrigin(
  value: string | undefined,
  fallback = 'http://localhost:3000'
): string {
  const raw = (value ?? fallback).trim();
  return gatewayOriginFromApiBase(normalizeApiBaseUrl(raw));
}

export function requireGatewayOriginFromEnv(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    throw new Error('VITE_GATEWAY_ORIGIN is required');
  }
  return resolveGatewayOrigin(raw, raw);
}
