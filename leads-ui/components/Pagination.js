'use client';

import { useEffect, useState } from 'react';

export const PAGE_SIZE = 20;

// Pages through an array. Returns the items for the current page plus what the controls need.
// Pass resetKey (for example the active filter) so the list goes back to page 1 when it changes.
export function usePagination(items, { pageSize = PAGE_SIZE, resetKey } = {}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    page: current,
    setPage,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}

export default function Pagination({ page, pageCount, total, from, to, onChange, noun = 'items' }) {
  return (
    <div className="pagination">
      <span className="pagination-summary">
        {total === 0 ? `No ${noun}` : `Showing ${from}–${to} of ${total} ${noun}`}
      </span>
      {pageCount > 1 && (
        <div className="pagination-controls">
          <button
            type="button"
            className="page-arrow"
            aria-label="Previous page"
            title="Previous page"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
          >
            ‹
          </button>
          <span className="pagination-page">{page} / {pageCount}</span>
          <button
            type="button"
            className="page-arrow"
            aria-label="Next page"
            title="Next page"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
