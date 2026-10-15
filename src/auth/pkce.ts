const PKCE_VERIFIER_KEY = 'vitafy_oauth_code_verifier';
const PKCE_STATE_KEY = 'vitafy_oauth_state';

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPkcePair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = randomString(32);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

export function createOAuthState(): string {
  return randomString(16);
}

export function persistPkceSession(codeVerifier: string, state: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
}

export function readPkceSession(): {
  codeVerifier: string | null;
  state: string | null;
} {
  return {
    codeVerifier: sessionStorage.getItem(PKCE_VERIFIER_KEY),
    state: sessionStorage.getItem(PKCE_STATE_KEY),
  };
}

export function clearPkceSession(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
}

export const JWT_STORAGE_KEY = 'vitafy_jwt_token';

export function saveJwtToken(token: string): void {
  localStorage.setItem(JWT_STORAGE_KEY, token);
}

export function readJwtToken(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY);
}

export function clearJwtToken(): void {
  localStorage.removeItem(JWT_STORAGE_KEY);
}

export { clearUserProfile } from './accessTokenProfile';
