import React from 'react';
import TransactionItem from './TransactionItem';

/**
 * TransactionList — renders a paginated list of transactions.
 *
 * Props:
 *   transactions – array of transaction objects
 *   pagination   – { page, pages, total, limit }
 *   loading      – boolean
 *   onPageChange – (pageNum) => void
 *   onUpdate     – async (id, updates) => void
 *   onDelete     – async (id) => void
 */
const TransactionList = ({
  transactions,
  pagination,
  loading,
  onPageChange,
  onUpdate,
  onDelete,
}) => {
  // Loading skeleton
  if (loading) {
    return (
      <div className="txn-list" id="transactions-list">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="txn-item txn-item--skeleton">
            <div className="txn-item__indicator skeleton-pulse" />
            <div className="txn-item__body">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line skeleton-line--long" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="txn-empty" id="transactions-empty">
        <div className="txn-empty__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <h3 className="txn-empty__title">No transactions yet</h3>
        <p className="txn-empty__text">
          Add your first income or expense to start tracking your finances.
        </p>
      </div>
    );
  }

  const { page, pages, total } = pagination;

  return (
    <div id="transactions-list-section">
      {/* Results count */}
      <div className="txn-list-header">
        <span className="txn-list-count">
          {total} transaction{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transaction items */}
      <div className="txn-list" id="transactions-list">
        {transactions.map((txn) => (
          <TransactionItem
            key={txn._id}
            transaction={txn}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="txn-pagination" id="transactions-pagination">
          <button
            className="btn btn-outline btn-sm"
            id="txn-page-prev"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Previous
          </button>

          <div className="txn-pagination__pages">
            {generatePageNumbers(page, pages).map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="txn-pagination__dots">…</span>
              ) : (
                <button
                  key={p}
                  className={`txn-pagination__page ${p === page ? 'active' : ''}`}
                  id={`txn-page-${p}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            className="btn btn-outline btn-sm"
            id="txn-page-next"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Generate page numbers with ellipsis for large page counts.
 */
function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}

export default TransactionList;
