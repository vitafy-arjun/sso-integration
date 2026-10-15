import type { VitafyOAuthPopupMessage } from './oauthMessages';

/** Fallback when COOP blocks `window.opener` during OAuth redirects (popup → partner origin). */
export const OAUTH_POPUP_RESULT_KEY = 'vitafy_oauth_popup_result';

export function writeOAuthPopupResult(message: VitafyOAuthPopupMessage): void {
  localStorage.setItem(OAUTH_POPUP_RESULT_KEY, JSON.stringify({ ...message, at: Date.now() }));
}

export function readOAuthPopupResult(): VitafyOAuthPopupMessage | null {
  const raw = localStorage.getItem(OAUTH_POPUP_RESULT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as VitafyOAuthPopupMessage & { at?: number };
    return parsed?.type ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOAuthPopupResult(): void {
  localStorage.removeItem(OAUTH_POPUP_RESULT_KEY);
}
