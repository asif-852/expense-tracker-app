import React from 'react';

/**
 * Format a whole-integer BDT amount with the taka sign and thousands separators.
 * Negative values show a minus sign before the symbol.
 */
const formatBDT = (amount) => {
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-BD');
  return `${isNegative ? '-' : ''}৳ ${formatted}`;
};

const SummaryCards = ({ totalIncome = 0, totalExpense = 0, netBalance = 0, loading = false }) => {
  if (loading) {
    return (
      <div className="card-grid" id="summary-cards">
        {[1, 2, 3].map((i) => (
          <div className="summary-card summary-card--skeleton" key={i}>
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-line" style={{ width: '50%', height: '28px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card-grid" id="summary-cards">
      <div className="summary-card summary-card--income" id="summary-income">
        <div className="summary-card__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div className="summary-card__label">Total Income</div>
        <div className="summary-card__amount">{formatBDT(totalIncome)}</div>
      </div>

      <div className="summary-card summary-card--expense" id="summary-expense">
        <div className="summary-card__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </svg>
        </div>
        <div className="summary-card__label">Total Expenses</div>
        <div className="summary-card__amount">{formatBDT(totalExpense)}</div>
      </div>

      <div className={`summary-card summary-card--balance ${netBalance < 0 ? 'summary-card--negative' : ''}`} id="summary-balance">
        <div className="summary-card__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="summary-card__label">Net Balance</div>
        <div className="summary-card__amount">{formatBDT(netBalance)}</div>
      </div>
    </div>
  );
};

export { formatBDT };
export default SummaryCards;
