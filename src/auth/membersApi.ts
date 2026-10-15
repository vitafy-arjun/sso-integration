import type {
  IntegrationListResponse,
  IntegrationMember,
  IntegrationMemberListItem,
  IntegrationMembership,
  IntegrationMembershipListItem,
} from '../types/integration';

export const DEFAULT_PAGE_SIZE = 20;

const MEMBERS_API_BASE = '/integrations/v1';

function buildIntegrationUrl(path: string, query?: Record<string, string>): string {
  const url = new URL(`${MEMBERS_API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function parseErrorMessage(text: string, status: number): string {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    if (typeof body.message === 'string' && body.message) {
      return body.message;
    }
  } catch {
    /* plain text */
  }
  return text || `Request failed (${status})`;
}

async function integrationGet<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status));
  }

  return JSON.parse(text) as T;
}

function normalizeIntegrationListResponse<T>(body: unknown): IntegrationListResponse<T> {
  const root = body as Record<string, unknown>;
  const data = Array.isArray(root.data) ? (root.data as T[]) : [];
  const offset = Number(root.offset ?? 0);
  const limit = Number(root.limit ?? DEFAULT_PAGE_SIZE);
  const totalRaw = root.total;
  const total =
    typeof totalRaw === 'number' && !Number.isNaN(totalRaw) ? totalRaw : data.length;

  return {
    success: root.success !== false,
    message: typeof root.message === 'string' ? root.message : 'OK',
    data,
    offset,
    limit,
    total,
  };
}

export type IntegrationListQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  memberId?: string;
  userId?: string;
};

export async function fetchMembers(
  accessToken: string,
  query?: IntegrationListQuery
): Promise<IntegrationListResponse<IntegrationMemberListItem>> {
  const params: Record<string, string> = {
    limit: String(query?.limit ?? DEFAULT_PAGE_SIZE),
    offset: String(query?.offset ?? 0),
  };
  if (query?.search?.trim()) {
    params.search = query.search.trim();
  }
  const body = await integrationGet<unknown>(
    accessToken,
    buildIntegrationUrl('/members', params)
  );
  const page = normalizeIntegrationListResponse<IntegrationMemberListItem>(body);
  if (!page.success) {
    throw new Error(page.message || 'Members request failed');
  }
  return page;
}

export async function fetchMemberById(
  accessToken: string,
  memberId: string
): Promise<IntegrationMember> {
  return integrationGet(
    accessToken,
    buildIntegrationUrl(`/members/${encodeURIComponent(memberId)}`)
  );
}

export async function fetchMemberships(
  accessToken: string,
  query?: IntegrationListQuery
): Promise<IntegrationListResponse<IntegrationMembershipListItem>> {
  const params: Record<string, string> = {
    limit: String(query?.limit ?? DEFAULT_PAGE_SIZE),
    offset: String(query?.offset ?? 0),
  };
  if (query?.search?.trim()) {
    params.search = query.search.trim();
  }
  if (query?.memberId?.trim()) {
    params.memberId = query.memberId.trim();
  }
  if (query?.userId?.trim()) {
    params.userId = query.userId.trim();
  }
  const body = await integrationGet<unknown>(
    accessToken,
    buildIntegrationUrl('/memberships', params)
  );
  const page = normalizeIntegrationListResponse<IntegrationMembershipListItem>(body);
  if (!page.success) {
    throw new Error(page.message || 'Memberships request failed');
  }
  return page;
}

export async function fetchMembershipById(
  accessToken: string,
  membershipId: string
): Promise<IntegrationMembership> {
  return integrationGet(
    accessToken,
    buildIntegrationUrl(`/memberships/${encodeURIComponent(membershipId)}`)
  );
}

export async function fetchMembershipsByMemberId(
  accessToken: string,
  memberId: string,
  query?: IntegrationListQuery
): Promise<IntegrationListResponse<IntegrationMembershipListItem>> {
  const trimmedMemberId = memberId.trim();
  if (!trimmedMemberId) {
    throw new Error('memberId is required');
  }
  return fetchMemberships(accessToken, { ...query, memberId: trimmedMemberId });
}
