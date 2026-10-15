import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  fetchMembers,
  fetchMemberships,
  fetchMembershipsByMemberId,
  type IntegrationListQuery,
} from '../auth/membersApi';
import IntegrationDetailModal, {
  type IntegrationDetailTarget,
} from '../components/IntegrationDetailModal';
import { IntegrationListPagination } from '../components/IntegrationListPagination';
import { useAccessTokenSession } from '../hooks/useAccessTokenSession';
import { useIntegrationList } from '../hooks/useIntegrationList';
import type {
  IntegrationMemberListItem,
  IntegrationMembershipListItem,
} from '../types/integration';

type TabId = 'members' | 'memberships';

type MemberMembershipsFocus = {
  memberId: string;
  label: string;
};

function formatCell(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  return String(value);
}

function rangeLabel(offset: number, count: number, total: number): string {
  if (total === 0 || count === 0) {
    return '0';
  }
  return `${offset + 1}–${offset + count} of ${total}`;
}

export default function IntegrationData() {
  const { token, remainingLabel, expired } = useAccessTokenSession();
  const [tab, setTab] = useState<TabId>('members');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [detailTarget, setDetailTarget] = useState<IntegrationDetailTarget | null>(null);
  const [memberMembershipsFocus, setMemberMembershipsFocus] =
    useState<MemberMembershipsFocus | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (tab !== 'members') {
      setMemberMembershipsFocus(null);
    }
  }, [tab]);

  const fetchMemberMembershipsPage = useCallback(
    (accessToken: string, query: IntegrationListQuery) => {
      const memberId = memberMembershipsFocus?.memberId?.trim();
      if (!memberId) {
        return Promise.reject(new Error('No member selected'));
      }
      return fetchMembershipsByMemberId(accessToken, memberId, query);
    },
    [memberMembershipsFocus]
  );

  const members = useIntegrationList<IntegrationMemberListItem>(
    token,
    tab === 'members' && !memberMembershipsFocus,
    search,
    fetchMembers
  );
  const memberMembershipsEnabled =
    tab === 'members' && Boolean(memberMembershipsFocus?.memberId.trim());
  const memberMemberships = useIntegrationList<IntegrationMembershipListItem>(
    token,
    memberMembershipsEnabled,
    search,
    fetchMemberMembershipsPage,
    memberMembershipsFocus?.memberId
  );
  const memberships = useIntegrationList<IntegrationMembershipListItem>(
    token,
    tab === 'memberships',
    search,
    fetchMemberships
  );
  if (!token || expired) {
    return <Navigate to="/" replace state={{ sessionExpired: expired }} />;
  }

  const listError = members.error ?? memberMemberships.error ?? memberships.error;

  return (
    <div className="g-app">
      <header className="g-app-bar">
        <div className="g-app-bar__start">
          <Link to="/" className="g-app-bar__logo" aria-label="Home">
            <span className="g-app-bar__logo-mark">V</span>
            <span className="g-app-bar__logo-text">Vitafy</span>
          </Link>
        </div>
        <div className="g-app-bar__end">
          {remainingLabel != null && (
            <span className="g-app-bar__session">Expires in {remainingLabel}</span>
          )}
          <Link to="/" className="g-btn g-btn--text g-btn--compact">
            Account
          </Link>
        </div>
      </header>

      <main className="g-app-main page--wide">
        <h1 className="g-page-title">Members &amp; memberships</h1>

        <div className="g-search-wrap">
          <span className="g-search-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </span>
          <input
            id="integration-search"
            type="search"
            className="g-search-input"
            placeholder="Search by name, email, or phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="g-tabs" role="tablist" aria-label="Integration lists">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'members'}
            className={tab === 'members' ? 'g-tab g-tab--active' : 'g-tab'}
            onClick={() => setTab('members')}
          >
            Members
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'memberships'}
            className={tab === 'memberships' ? 'g-tab g-tab--active' : 'g-tab'}
            onClick={() => setTab('memberships')}
          >
            Memberships
          </button>
        </div>

        {listError && <p className="error">{listError}</p>}

        {tab === 'members' && memberMembershipsFocus && (
          <section className="g-card data-section" aria-busy={memberMemberships.loading}>
            <div className="g-list-toolbar">
              <button
                type="button"
                className="g-btn g-btn--text g-btn--compact"
                onClick={() => setMemberMembershipsFocus(null)}
              >
                ← All members
              </button>
            </div>
            <h2 className="g-card__heading">
              Memberships for {memberMembershipsFocus.label} —{' '}
              {rangeLabel(
                memberMemberships.offset,
                memberMemberships.items.length,
                memberMemberships.total
              )}{' '}
              (total {memberMemberships.total})
            </h2>
            {memberMemberships.loading && memberMemberships.items.length === 0 ? (
              <p className="g-muted">Loading…</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Offering</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Updated</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody key={`member-memberships-page-${memberMemberships.offset}`}>
                      {memberMemberships.items.map((ms) => (
                        <tr key={ms.id}>
                          <td>{ms.offeringName ?? ms.tier ?? '—'}</td>
                          <td>{formatCell(ms.status)}</td>
                          <td>{formatCell(ms.startDate)}</td>
                          <td>{formatCell(ms.endDate)}</td>
                          <td>{formatCell(ms.updatedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="g-btn g-btn--text g-btn--compact"
                              onClick={() =>
                                setDetailTarget({
                                  kind: 'membership',
                                  id: ms.id,
                                  title:
                                    ms.offeringName ?? ms.memberName ?? 'Membership details',
                                })
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {memberMemberships.items.length === 0 && !memberMemberships.loading && (
                    <p className="g-muted table-empty">No memberships for this member.</p>
                  )}
                </div>
                {memberMemberships.loading && memberMemberships.items.length > 0 ? (
                  <p className="g-muted pagination-loading">Updating list…</p>
                ) : null}
                <IntegrationListPagination
                  total={memberMemberships.total}
                  offset={memberMemberships.offset}
                  pageSize={memberMemberships.items.length}
                  pageIndex={memberMemberships.pageIndex}
                  pageCount={memberMemberships.pageCount}
                  loading={memberMemberships.loading}
                  hasPrev={memberMemberships.hasPrev}
                  hasNext={memberMemberships.hasNext}
                  onPrev={memberMemberships.goPrev}
                  onNext={memberMemberships.goNext}
                />
              </>
            )}
          </section>
        )}

        {tab === 'members' && !memberMembershipsFocus && (
          <section className="g-card data-section" aria-busy={members.loading}>
            <h2 className="g-card__heading">
              Members — {rangeLabel(members.offset, members.items.length, members.total)} (total{' '}
              {members.total})
            </h2>
            {members.loading && members.items.length === 0 ? (
              <p className="g-muted">Loading…</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody key={`members-page-${members.offset}`}>
                      {members.items.map((m) => (
                        <tr key={m.id}>
                          <td>{m.displayName ?? m.id}</td>
                          <td>{formatCell(m.email)}</td>
                          <td>{formatCell(m.phone)}</td>
                          <td>{formatCell(m.status)}</td>
                          <td>{formatCell(m.updatedAt)}</td>
                          <td className="data-table__actions">
                            <button
                              type="button"
                              className="g-btn g-btn--text g-btn--compact"
                              disabled={!m.id || m.id === 'undefined'}
                              onClick={() =>
                                setMemberMembershipsFocus({
                                  memberId: m.id,
                                  label: m.displayName ?? m.email ?? m.id,
                                })
                              }
                            >
                              Memberships
                            </button>
                            <button
                              type="button"
                              className="g-btn g-btn--text g-btn--compact"
                              disabled={!m.id || m.id === 'undefined'}
                              onClick={() =>
                                setDetailTarget({
                                  kind: 'member',
                                  id: m.id,
                                  title: m.displayName ?? 'Member details',
                                })
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {members.items.length === 0 && !members.loading && (
                    <p className="g-muted table-empty">No members match your search.</p>
                  )}
                </div>
                {members.loading && members.items.length > 0 ? (
                  <p className="g-muted pagination-loading">Updating list…</p>
                ) : null}
                <IntegrationListPagination
                  total={members.total}
                  offset={members.offset}
                  pageSize={members.items.length}
                  pageIndex={members.pageIndex}
                  pageCount={members.pageCount}
                  loading={members.loading}
                  hasPrev={members.hasPrev}
                  hasNext={members.hasNext}
                  onPrev={members.goPrev}
                  onNext={members.goNext}
                />
              </>
            )}
          </section>
        )}

        {tab === 'memberships' && (
          <section className="g-card data-section" aria-busy={memberships.loading}>
            <h2 className="g-card__heading">
              Memberships — {rangeLabel(memberships.offset, memberships.items.length, memberships.total)}{' '}
              (total {memberships.total})
            </h2>
            {memberships.loading && memberships.items.length === 0 ? (
              <p className="g-muted">Loading…</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Offering</th>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Updated</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody key={`memberships-page-${memberships.offset}`}>
                      {memberships.items.map((ms) => (
                        <tr key={ms.id}>
                          <td>{ms.offeringName ?? ms.tier ?? '—'}</td>
                          <td>{ms.memberName ?? ms.memberId ?? '—'}</td>
                          <td>{formatCell(ms.memberEmail)}</td>
                          <td>{formatCell(ms.status)}</td>
                          <td>{formatCell(ms.startDate)}</td>
                          <td>{formatCell(ms.endDate)}</td>
                          <td>{formatCell(ms.updatedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="g-btn g-btn--text g-btn--compact"
                              onClick={() =>
                                setDetailTarget({
                                  kind: 'membership',
                                  id: ms.id,
                                  title: ms.offeringName ?? ms.memberName ?? 'Membership details',
                                })
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {memberships.items.length === 0 && !memberships.loading && (
                    <p className="g-muted table-empty">No memberships match your search.</p>
                  )}
                </div>
                {memberships.loading && memberships.items.length > 0 ? (
                  <p className="g-muted pagination-loading">Updating list…</p>
                ) : null}
                <IntegrationListPagination
                  total={memberships.total}
                  offset={memberships.offset}
                  pageSize={memberships.items.length}
                  pageIndex={memberships.pageIndex}
                  pageCount={memberships.pageCount}
                  loading={memberships.loading}
                  hasPrev={memberships.hasPrev}
                  hasNext={memberships.hasNext}
                  onPrev={memberships.goPrev}
                  onNext={memberships.goNext}
                />
              </>
            )}
          </section>
        )}

        <IntegrationDetailModal
          accessToken={token}
          target={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      </main>
    </div>
  );
}
