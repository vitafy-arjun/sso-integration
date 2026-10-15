import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VitafySignInButton from '../components/VitafySignInButton';
import {
  profileAvatarInitial,
  profileDisplayName,
  resolveUserProfileAfterLogin,
} from '../auth/accessTokenProfile';
import { clearJwtToken, clearUserProfile, saveJwtToken } from '../auth/pkce';
import { loginWithVitafy } from '../auth/loginWithVitafy';
import { getPartnerCredentials } from '../auth/partnerEnv';
import { useAccessTokenSession } from '../hooks/useAccessTokenSession';
import { useOAuthUserProfile } from '../hooks/useOAuthUserProfile';

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionExpired = Boolean(
    (location.state as { sessionExpired?: boolean } | null)?.sessionExpired
  );
  const { token, remainingLabel, expired, refreshTokenFromStorage } = useAccessTokenSession();
  const { profile, loading: profileLoading } = useOAuthUserProfile(
    token && !expired ? token : null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const partner = (() => {
    try {
      return getPartnerCredentials();
    } catch {
      return null;
    }
  })();

  const signedIn = Boolean(token) && !expired;

  const handleLogin = async (windowMode: 'popup' | 'tab' = 'popup') => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await loginWithVitafy({ window: windowMode });
      saveJwtToken(tokens.access_token);
      await resolveUserProfileAfterLogin(tokens);
      refreshTokenFromStorage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearJwtToken();
    clearUserProfile();
    refreshTokenFromStorage();
  };

  const displayName = profile ? profileDisplayName(profile) : '…';
  const email = profile?.email?.trim() ?? '';
  const avatarInitial = profile ? profileAvatarInitial(profile) : '…';

  return (
    <div className="g-auth-screen">
      <main className="g-auth-card">
        {!signedIn && (
          <div className="g-auth-card__logo" aria-hidden>
            <span className="g-auth-card__logo-mark">V</span>
          </div>
        )}

        {!signedIn ? (
          <>
            <h1 className="g-auth-card__title">Sign in</h1>
            <p className="g-auth-card__subtitle">
              Use your Vitafy account to continue to the partner app
            </p>

            {(sessionExpired || expired) && (
              <p className="g-auth-card__alert" role="alert">
                Session expired. Sign in again.
              </p>
            )}

            {!partner && (
              <p className="g-auth-card__alert" role="alert">
                Missing VITE_* env vars — restart the dev server after updating .env.
              </p>
            )}

            <div className="g-auth-card__actions">
              <VitafySignInButton
                onClick={() => handleLogin('popup')}
                loading={loading}
                disabled={!partner}
              />
              <button
                type="button"
                className="g-btn g-btn--text"
                disabled={!partner || loading}
                onClick={() => handleLogin('tab')}
              >
                Sign in in a new tab
              </button>
            </div>
            <p className="g-auth-card__footer g-auth-card__footer--tight">
              Sign-in opens Vitafy SSO; the SSO app talks to the Vitafy API (not your browser to the API for authorize).
            </p>

            {error && (
              <p className="g-auth-card__alert" role="alert">
                {error}
              </p>
            )}

            <p className="g-auth-card__footer">
              Access tokens expire in about 15 minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className="g-auth-card__title g-auth-card__title--sm">Choose an account</h1>
            <p className="g-auth-card__subtitle g-auth-card__subtitle--tight">
              Continue to members and memberships
            </p>

            <button
              type="button"
              className="g-account-picker"
              disabled={profileLoading && !profile}
              onClick={() => navigate('/integration-data')}
            >
              <span className="g-account-picker__avatar" aria-hidden>
                {avatarInitial}
              </span>
              <span className="g-account-picker__text">
                <span className="g-account-picker__name">
                  {profileLoading && !profile?.name ? 'Loading profile…' : displayName}
                </span>
                <span className="g-account-picker__email">
                  {profileLoading && !profile?.email
                    ? 'Fetching email…'
                    : email || 'Email not available — sign in again'}
                </span>
              </span>
            </button>

            {remainingLabel != null && (
              <p className="g-auth-card__footer">Session expires in {remainingLabel}</p>
            )}

            <div className="g-auth-card__actions g-auth-card__actions--center">
              <button type="button" className="g-btn g-btn--text" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="g-auth-footer">
        <span>Partner integration demo</span>
      </footer>
    </div>
  );
}
