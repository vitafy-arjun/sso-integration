export type AccessTokenProfile = {
  sub: string;
  name?: string;
  email?: string;
};

const USER_PROFILE_STORAGE_KEY = 'vitafy_user_profile';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) {
      return null;
    }
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickString(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function profileFromPayload(payload: Record<string, unknown>): AccessTokenProfile | null {
  const sub = pickString(payload, 'sub');
  if (!sub) {
    return null;
  }
  const email = pickString(payload, 'email', 'preferred_username');
  const given = pickString(payload, 'given_name', 'firstName', 'first_name');
  const family = pickString(payload, 'family_name', 'lastName', 'last_name');
  const combinedName = [given, family].filter(Boolean).join(' ').trim();
  const name =
    pickString(payload, 'name', 'displayName', 'display_name', 'full_name') ||
    combinedName ||
    undefined;

  return { sub, name, email };
}

export function decodeAccessTokenProfile(accessToken: string): AccessTokenProfile | null {
  const payload = decodeJwtPayload(accessToken);
  return payload ? profileFromPayload(payload) : null;
}

export function decodeIdTokenProfile(idToken: string): AccessTokenProfile | null {
  const payload = decodeJwtPayload(idToken);
  return payload ? profileFromPayload(payload) : null;
}

const USERINFO_URL = '/integrations/oauth/userinfo';

export async function fetchOAuthUserInfo(accessToken: string): Promise<AccessTokenProfile> {
  const response = await fetch(USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Userinfo failed (${response.status})`);
  }

  const body = JSON.parse(text) as Record<string, unknown>;
  const profile = profileFromPayload(body);
  if (!profile) {
    throw new Error('Userinfo response missing sub');
  }
  return profile;
}

export function saveUserProfile(profile: AccessTokenProfile): void {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function readUserProfile(): AccessTokenProfile | null {
  const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AccessTokenProfile;
    if (parsed?.sub) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearUserProfile(): void {
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
}

export async function resolveUserProfileAfterLogin(input: {
  access_token: string;
  id_token?: string;
}): Promise<AccessTokenProfile> {
  if (input.id_token) {
    const fromId = decodeIdTokenProfile(input.id_token);
    if (fromId?.name || fromId?.email) {
      saveUserProfile(fromId);
      return fromId;
    }
  }

  try {
    const fromUserInfo = await fetchOAuthUserInfo(input.access_token);
    saveUserProfile(fromUserInfo);
    return fromUserInfo;
  } catch {
    const fromAccess = decodeAccessTokenProfile(input.access_token);
    const fallback: AccessTokenProfile = fromAccess ?? { sub: 'unknown' };
    saveUserProfile(fallback);
    return fallback;
  }
}

export function profileDisplayName(profile: AccessTokenProfile): string {
  if (profile.name?.trim()) {
    return profile.name.trim();
  }
  if (profile.email?.trim()) {
    const local = profile.email.split('@')[0]?.trim();
    if (local) {
      return local;
    }
  }
  return 'Vitafy user';
}

export function profileAvatarInitial(profile: AccessTokenProfile): string {
  const source = profile.name?.trim() || profile.email?.trim() || profile.sub;
  const letter = source.charAt(0);
  return letter ? letter.toUpperCase() : 'V';
}
