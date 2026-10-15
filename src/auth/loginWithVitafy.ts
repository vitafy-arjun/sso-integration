import { buildOAuthAuthorizeUrl } from './oauthAuthorize';
import {
  clearPkceSession,
  createOAuthState,
  createPkcePair,
  persistPkceSession,
  readPkceSession,
} from './pkce';
import {
  clearOAuthPopupResult,
  readOAuthPopupResult,
} from './oauthPopupBridge';
import {
  getPartnerOrigin,
  VITAFY_OAUTH_ERROR,
  VITAFY_OAUTH_SUCCESS,
  type VitafyOAuthPopupMessage,
} from './oauthMessages';

const POPUP_NAME = 'vitafy-login';

export type VitafyLoginWindow = 'popup' | 'tab';

export type VitafyLoginOptions = {
  /** `popup` = sized window; `tab` = new browser tab (still uses opener + postMessage). */
  window?: VitafyLoginWindow;
};

export type VitafyLoginResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
};

async function exchangeCodeOnPartnerBackend(
  code: string,
  codeVerifier: string
): Promise<VitafyLoginResult> {
  const response = await fetch('/auth/vitafy/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });

  clearPkceSession();

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Token exchange failed (${response.status})`);
  }

  return (await response.json()) as VitafyLoginResult;
}

function openVitafyLoginWindow(
  authorizeUrl: string,
  mode: VitafyLoginWindow
): Window | null {
  if (mode === 'tab') {
    return window.open(authorizeUrl, '_blank');
  }

  const width = 500;
  const height = 700;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

  return window.open(
    authorizeUrl,
    POPUP_NAME,
    `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,location=yes,status=no,scrollbars=yes,resizable=yes`
  );
}

export async function loginWithVitafy(
  options: VitafyLoginOptions = {}
): Promise<VitafyLoginResult> {
  const windowMode = options.window ?? 'popup';
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = createOAuthState();
  persistPkceSession(codeVerifier, state);

  const authorizeUrl = await buildOAuthAuthorizeUrl({ codeChallenge, state });

  const popup = openVitafyLoginWindow(authorizeUrl, windowMode);

  if (!popup) {
    const hint =
      windowMode === 'tab'
        ? 'Could not open a new tab. Check your browser settings and try again.'
        : 'Popup blocked. Allow popups for this site and try again.';
    throw new Error(hint);
  }

  const partnerOrigin = getPartnerOrigin();
  clearOAuthPopupResult();

  return new Promise((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closedPoll);
      clearInterval(storagePoll);
    };

    const finishWithError = (message: string) => {
      finished = true;
      cleanup();
      try {
        if (!popup.closed) {
          popup.close();
        }
      } catch {
        /* ignore */
      }
      clearOAuthPopupResult();
      reject(new Error(message));
    };

    const handlePopupMessage = (data: VitafyOAuthPopupMessage) => {
      if (data.type === VITAFY_OAUTH_ERROR) {
        finishWithError(data.error);
        return;
      }

      if (data.type !== VITAFY_OAUTH_SUCCESS) {
        return;
      }

      finished = true;
      cleanup();
      try {
        if (!popup.closed) {
          popup.close();
        }
      } catch {
        /* ignore */
      }
      clearOAuthPopupResult();

      const { state: expectedState, codeVerifier: verifier } = readPkceSession();
      if (expectedState && data.state !== expectedState) {
        reject(new Error('Invalid OAuth state. Try logging in again.'));
        return;
      }
      if (!verifier) {
        reject(new Error('PKCE verifier missing. Start login again.'));
        return;
      }

      exchangeCodeOnPartnerBackend(data.code, verifier).then(resolve).catch(reject);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== partnerOrigin) {
        return;
      }
      const data = event.data as VitafyOAuthPopupMessage | undefined;
      if (data?.type) {
        handlePopupMessage(data);
      }
    };

    window.addEventListener('message', onMessage);

    const storagePoll = window.setInterval(() => {
      if (finished) {
        return;
      }
      const bridged = readOAuthPopupResult();
      if (bridged) {
        handlePopupMessage(bridged);
      }
    }, 300);

    const closedPoll = window.setInterval(() => {
      if (popup.closed && !finished) {
        finishWithError('Sign-in window was closed before completing login.');
      }
    }, 400);
  });
}
