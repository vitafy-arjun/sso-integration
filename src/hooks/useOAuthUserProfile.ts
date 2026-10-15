import { useEffect, useState } from 'react';
import {
  type AccessTokenProfile,
  fetchOAuthUserInfo,
  readUserProfile,
  saveUserProfile,
} from '../auth/accessTokenProfile';

export function useOAuthUserProfile(accessToken: string | null) {
  const [profile, setProfile] = useState<AccessTokenProfile | null>(() => readUserProfile());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      return;
    }

    const cached = readUserProfile();
    if (cached?.name && cached?.email) {
      setProfile(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const fresh = await fetchOAuthUserInfo(accessToken);
        if (!cancelled) {
          saveUserProfile(fresh);
          setProfile(fresh);
        }
      } catch {
        if (!cancelled && cached) {
          setProfile(cached);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return { profile, loading };
}
