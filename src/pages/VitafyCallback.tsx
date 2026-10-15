import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { writeOAuthPopupResult } from '../auth/oauthPopupBridge';
import {
  getPartnerOrigin,
  VITAFY_OAUTH_ERROR,
  VITAFY_OAUTH_SUCCESS,
  type VitafyOAuthPopupMessage,
} from '../auth/oauthMessages';
import { readPkceSession } from '../auth/pkce';

function isOAuthPopup(): boolean {
  return Boolean(window.opener && !window.opener.closed);
}

function postToOpener(message: VitafyOAuthPopupMessage): void {
  if (!window.opener || window.opener.closed) {
    return;
  }
  window.opener.postMessage(message, getPartnerOrigin());
}

function deliverResult(message: VitafyOAuthPopupMessage): void {
  writeOAuthPopupResult(message);
  postToOpener(message);
}

function closePopup(): void {
  const attempt = () => {
    try {
      window.close();
    } catch {
      /* ignore */
    }
  };
  attempt();
  window.setTimeout(attempt, 100);
  window.setTimeout(attempt, 400);
}

function CallbackCard({
  title,
  message,
  showHomeLink,
}: {
  title: string;
  message: ReactNode;
  showHomeLink?: boolean;
}) {
  return (
    <div className="g-auth-screen">
      <main className="g-auth-card g-auth-card--compact">
        <div className="g-auth-card__logo" aria-hidden>
          <span className="g-auth-card__logo-mark">V</span>
        </div>
        <h1 className="g-auth-card__title g-auth-card__title--sm">{title}</h1>
        <p className="g-auth-card__subtitle">{message}</p>
        {showHomeLink && (
          <Link to="/" className="g-btn g-btn--text">
            Back to sign in
          </Link>
        )}
      </main>
    </div>
  );
}

export default function VitafyCallback() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [standaloneError, setStandaloneError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const oauthErrorDescription = searchParams.get('error_description');
    const inPopup = isOAuthPopup();

    const finish = (message: VitafyOAuthPopupMessage) => {
      deliverResult(message);
      if (inPopup) {
        closePopup();
      }
      setDone(true);
    };

    const { state: expectedState } = readPkceSession();

    if (oauthError) {
      finish({
        type: VITAFY_OAUTH_ERROR,
        error: oauthErrorDescription ?? oauthError,
        state,
      });
      if (!inPopup) {
        setStandaloneError(oauthErrorDescription ?? oauthError);
      }
      return;
    }

    if (!code) {
      const msg = 'Missing authorization code in callback URL.';
      finish({
        type: VITAFY_OAUTH_ERROR,
        error: msg,
        state,
      });
      if (!inPopup) {
        setStandaloneError(msg);
      }
      return;
    }

    if (expectedState && state !== expectedState) {
      const msg = 'Invalid OAuth state. Try logging in again.';
      finish({
        type: VITAFY_OAUTH_ERROR,
        error: msg,
        state,
      });
      if (!inPopup) {
        setStandaloneError(msg);
      }
      return;
    }

    finish({
      type: VITAFY_OAUTH_SUCCESS,
      code,
      state: state ?? '',
    });
  }, [searchParams]);

  if (!isOAuthPopup()) {
    if (standaloneError) {
      return (
        <CallbackCard title="Couldn't sign you in" message={standaloneError} showHomeLink />
      );
    }
    if (done) {
      return (
        <CallbackCard
          title="You're signed in"
          message="Return to the partner app tab to continue."
          showHomeLink
        />
      );
    }
    return (
      <CallbackCard
        title="Vitafy sign-in"
        message={
          <>
            This page is used inside the sign-in popup. Open the partner app and choose{' '}
            <strong>Sign in with Vitafy</strong>.
          </>
        }
        showHomeLink
      />
    );
  }

  if (done) {
    return (
      <CallbackCard title="Returning to app…" message="This window should close automatically." />
    );
  }

  return <CallbackCard title="Completing sign-in…" message="Please wait." />;
}
