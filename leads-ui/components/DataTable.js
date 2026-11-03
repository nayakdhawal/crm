'use client';

import Pagination from '@/components/Pagination';

// A table with a header and footer. Both carry the pagination controls.
//   pager    the object returned by usePagination(); the table renders pager.pageItems
//   noun     what the rows are called in the summary, e.g. "leads"
//   title    optional heading shown at the left of the header
//   actions  optional buttons or controls shown at the right of the header
//   footer   optional content shown under the pagination in the footer
export default function DataTable({ pager, noun, title, actions, footer, children }) {
  const controls = (
    <Pagination
      page={pager.page}
      pageCount={pager.pageCount}
      total={pager.total}
      from={pager.from}
      to={pager.to}
      onChange={pager.setPage}
      noun={noun}
    />
  );

  return (
    <div className="data-table">
      <div className="data-table-header">
        {title && <div className="data-table-title">{title}</div>}
        <div className="data-table-header-right">
          {actions}
          {controls}
        </div>
      </div>

      <div className="table-card">{children}</div>

      <div className="data-table-footer">
        {controls}
        {footer && <div className="data-table-note">{footer}</div>}
      </div>
    </div>
  );
}
