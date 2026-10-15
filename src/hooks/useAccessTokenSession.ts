import { useEffect, useState } from 'react';
import { clearUserProfile } from '../auth/accessTokenProfile';
import { clearJwtToken, readJwtToken } from '../auth/pkce';

function getAccessTokenExpiryMs(accessToken: string): number | null {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) {
      return null;
    }
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function formatRemainingMs(remainingMs: number): string {
  if (remainingMs <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function useAccessTokenSession() {
  const [token, setToken] = useState<string | null>(() => readJwtToken());
  const [remainingLabel, setRemainingLabel] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      setRemainingLabel(null);
      return;
    }

    const expiryMs = getAccessTokenExpiryMs(token);
    if (!expiryMs) {
      setRemainingLabel(null);
      setExpired(false);
      return;
    }

    const tick = () => {
      const left = expiryMs - Date.now();
      if (left <= 0) {
        clearJwtToken();
        clearUserProfile();
        setToken(null);
        setRemainingLabel(null);
        setExpired(true);
        return;
      }
      setRemainingLabel(formatRemainingMs(left));
      setExpired(false);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [token]);

  const refreshTokenFromStorage = () => {
    setExpired(false);
    setToken(readJwtToken());
  };

  return { token, remainingLabel, expired, refreshTokenFromStorage };
}
