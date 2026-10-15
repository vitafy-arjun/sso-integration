type IntegrationListPaginationProps = {
  total: number;
  offset: number;
  pageSize: number;
  pageIndex: number;
  pageCount: number;
  loading: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function IntegrationListPagination({
  total,
  offset,
  pageSize,
  pageIndex,
  pageCount,
  loading,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: IntegrationListPaginationProps) {
  if (total === 0 && pageSize === 0 && offset === 0) {
    return null;
  }

  const showing =
    pageSize > 0 && total > 0
      ? `${offset + 1}–${offset + pageSize} of ${total}`
      : total > 0
        ? `Total: ${total}`
        : '';

  return (
    <nav className="pagination-bar" aria-label="List pagination">
      <div className="pagination-bar__meta">
        <strong className="pagination-bar__total">Total: {total}</strong>
        {showing ? <span className="pagination-bar__range">{showing}</span> : null}
        <span className="pagination-bar__page">
          Page {pageIndex} of {pageCount}
        </span>
      </div>
      <div className="pagination-bar__actions">
        <button
          type="button"
          className="g-btn g-btn--tonal"
          disabled={!hasPrev || loading}
          onClick={onPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className="g-btn g-btn--tonal"
          disabled={!hasNext || loading}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
