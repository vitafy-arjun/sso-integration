import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, type IntegrationListQuery } from '../auth/membersApi';
import type { IntegrationListResponse } from '../types/integration';

type FetchPage<T> = (
  accessToken: string,
  query: IntegrationListQuery
) => Promise<IntegrationListResponse<T>>;

export function useIntegrationList<T>(
  accessToken: string | null,
  enabled: boolean,
  search: string,
  fetchPage: FetchPage<T>,
  /** When this changes (e.g. user id), pagination resets to the first page. */
  scopeKey?: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setOffset(0);
  }, [enabled, search, scopeKey]);

  useEffect(() => {
    if (!accessToken || !enabled) {
      return;
    }

    const token = accessToken;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchPage(token, {
          limit: DEFAULT_PAGE_SIZE,
          offset,
          search: search || undefined,
        });
        if (cancelled) {
          return;
        }
        setItems(page.data ?? []);
        setOffset(page.offset);
        setLimit(page.limit);
        setTotal(page.total);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [accessToken, enabled, search, offset, fetchPage]);

  const pageCount = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const pageIndex = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
  const hasPrev = offset > 0;
  const hasNext = total > 0 ? offset + items.length < total : items.length >= limit;

  const goPrev = useCallback(() => {
    if (offset > 0 && !loading) {
      setOffset(Math.max(0, offset - limit));
    }
  }, [offset, limit, loading]);

  const goNext = useCallback(() => {
    if (!loading && (total > 0 ? offset + items.length < total : items.length >= limit)) {
      setOffset(offset + limit);
    }
  }, [offset, limit, loading, total, items.length]);

  return {
    items,
    offset,
    limit,
    total,
    pageIndex,
    pageCount,
    loading,
    error,
    hasPrev,
    hasNext,
    goPrev,
    goNext,
  };
}
