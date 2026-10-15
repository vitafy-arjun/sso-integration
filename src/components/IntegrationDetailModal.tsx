import { useEffect, useState } from 'react';
import { fetchMemberById, fetchMembershipById } from '../auth/membersApi';

export type IntegrationDetailTarget = {
  kind: 'member' | 'membership';
  id: string;
  title?: string;
};

type Props = {
  accessToken: string;
  target: IntegrationDetailTarget | null;
  onClose: () => void;
};

export default function IntegrationDetailModal({ accessToken, target, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState<unknown>(null);

  useEffect(() => {
    if (!target) {
      setBody(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setBody(null);
      try {
        const data =
          target.kind === 'member'
            ? await fetchMemberById(accessToken, target.id)
            : await fetchMembershipById(accessToken, target.id);
        if (!cancelled) {
          setBody(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load details');
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
  }, [accessToken, target]);

  useEffect(() => {
    if (!target) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) {
    return null;
  }

  const heading =
    target.title ??
    (target.kind === 'member' ? 'Member details' : 'Membership details');

  return (
    <div className="detail-modal" role="presentation" onClick={onClose}>
      <div
        className="detail-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-modal__header">
          <h2 id="integration-detail-title">{heading}</h2>
          <button type="button" className="g-btn g-btn--text" onClick={onClose}>
            Close
          </button>
        </header>
        {loading && <p className="g-muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {body != null && <pre className="detail-json">{JSON.stringify(body, null, 2)}</pre>}
      </div>
    </div>
  );
}
