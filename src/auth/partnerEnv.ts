export const OAUTH_CALLBACK_PATH = '/auth/vitafy/callback';

export const DEFAULT_OAUTH_SCOPE =
  'openid profile email members:read memberships:read';

export interface PartnerCredentials {
  tenantId: string;
  redirectUri: string;
}

function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${name} in .env`);
  }
  return trimmed;
}

export function getOAuthRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}${OAUTH_CALLBACK_PATH}`;
  }
  throw new Error('OAuth redirect URI requires a browser context');
}

export function getPartnerCredentials(): PartnerCredentials {
  const tenantId = requireEnv(
    'VITE_TENANT_ID',
    import.meta.env.VITE_TENANT_ID as string | undefined
  );

  return {
    tenantId,
    redirectUri: getOAuthRedirectUri(),
  };
}
