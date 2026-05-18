import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import summaryService from '../services/summaryService';
import SummaryCards, { formatBDT } from '../components/SummaryCards';

/* ── Date range helpers ──────────────────────────────────── */
const getToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const DATE_RANGES = {
  thisMonth: () => {
    const now = new Date();
    return {
      label: 'This Month',
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  },
  lastMonth: () => {
    const now = new Date();
    return {
      label: 'Last Month',
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  },
  thisYear: () => {
    const now = new Date();
    return {
      label: 'This Year',
      from: new Date(now.getFullYear(), 0, 1),
      to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  },
  last30Days: () => {
    const today = getToday();
    const past = new Date(today);
    past.setDate(past.getDate() - 30);
    return {
      label: 'Last 30 Days',
      from: past,
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    };
  },
  allTime: () => ({
    label: 'All Time',
    from: null,
    to: null,
  }),
};

/* ── Tiny bar chart component (no library needed) ────────── */
const IncomeExpenseChart = ({ totalIncome, totalExpense }) => {
  const max = Math.max(totalIncome, totalExpense, 1);
  const incomeWidth = (totalIncome / max) * 100;
  const expenseWidth = (totalExpense / max) * 100;

  return (
    <div className="mini-chart" id="income-expense-chart">
      <div className="mini-chart__bar-group">
        <div className="mini-chart__label">Income</div>
        <div className="mini-chart__bar-track">
          <div
            className="mini-chart__bar mini-chart__bar--income"
            style={{ width: `${incomeWidth}%` }}
          />
        </div>
        <div className="mini-chart__value mini-chart__value--income">
          {formatBDT(totalIncome)}
        </div>
      </div>
      <div className="mini-chart__bar-group">
        <div className="mini-chart__label">Expenses</div>
        <div className="mini-chart__bar-track">
          <div
            className="mini-chart__bar mini-chart__bar--expense"
            style={{ width: `${expenseWidth}%` }}
          />
        </div>
        <div className="mini-chart__value mini-chart__value--expense">
          {formatBDT(totalExpense)}
        </div>
      </div>
    </div>
  );
};

/* ── Category breakdown list ─────────────────────────────── */
const CategoryList = ({ categories, type, total }) => {
  if (!categories || categories.length === 0) {
    return <p className="text-muted" style={{ fontSize: '0.85rem' }}>No {type} transactions yet.</p>;
  }

  return (
    <div className="category-list">
      {categories.map((cat) => {
        const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : 0;
        return (
          <div className="category-list__item" key={cat.category}>
            <div className="category-list__info">
              <span className="category-list__name">{cat.category}</span>
              <span className="category-list__count">{cat.count} txn{cat.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="category-list__bar-track">
              <div
                className={`category-list__bar category-list__bar--${type}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="category-list__amount">
              <span className={`category-list__value category-list__value--${type}`}>
                {formatBDT(cat.total)}
              </span>
              <span className="category-list__pct">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Recent transaction row ──────────────────────────────── */
const RecentTxnRow = ({ txn }) => {
  const dateStr = new Date(txn.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className={`recent-txn recent-txn--${txn.type}`}>
      <div className={`recent-txn__indicator recent-txn__indicator--${txn.type}`} />
      <div className="recent-txn__info">
        <span className="recent-txn__category">{txn.category}</span>
        {txn.description && (
          <span className="recent-txn__desc">{txn.description}</span>
        )}
      </div>
      <div className="recent-txn__right">
        <span className={`recent-txn__amount recent-txn__amount--${txn.type}`}>
          {txn.type === 'expense' ? '-' : '+'}{formatBDT(txn.amount)}
        </span>
        <span className="recent-txn__date">{dateStr}</span>
      </div>
    </div>
  );
};

/* ── Dashboard Page ──────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const [rangeKey, setRangeKey] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let params = {};
      if (rangeKey === 'custom') {
        if (customFrom) params.from = new Date(customFrom).toISOString();
        if (customTo) {
          // Set to end of selected day
          const endDate = new Date(customTo);
          endDate.setHours(23, 59, 59, 999);
          params.to = endDate.toISOString();
        }
      } else {
        const range = DATE_RANGES[rangeKey]();
        if (range.from) params.from = range.from.toISOString();
        if (range.to) params.to = range.to.toISOString();
      }
      const data = await summaryService.get(params);
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [rangeKey, customFrom, customTo]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const currentLabel =
    rangeKey === 'custom'
      ? 'Custom Range'
      : DATE_RANGES[rangeKey]().label;

  return (
    <div className="page-container" id="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, <strong>{user?.username}</strong> — here&apos;s your financial overview.
        </p>
      </div>

      {/* ── Date range selector ─────────────────────────────── */}
      <div className="date-range-bar" id="date-range-bar">
        <div className="date-range-pills">
          {Object.entries(DATE_RANGES).map(([key, fn]) => (
            <button
              key={key}
              className={`date-range-pill ${rangeKey === key ? 'active' : ''}`}
              id={`range-${key}`}
              onClick={() => setRangeKey(key)}
            >
              {fn().label}
            </button>
          ))}
          <button
            className={`date-range-pill ${rangeKey === 'custom' ? 'active' : ''}`}
            id="range-custom"
            onClick={() => setRangeKey('custom')}
          >
            Custom
          </button>
        </div>

        {rangeKey === 'custom' && (
          <div className="date-range-custom" id="custom-date-inputs">
            <input
              type="date"
              className="form-control form-control--date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              id="custom-from"
            />
            <span className="date-range-separator">to</span>
            <input
              type="date"
              className="form-control form-control--date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              id="custom-to"
            />
          </div>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && <div className="alert alert-error" id="summary-error">{error}</div>}

      {/* ── Summary Cards ──────────────────────────────────── */}
      <SummaryCards
        totalIncome={summary?.totalIncome || 0}
        totalExpense={summary?.totalExpense || 0}
        netBalance={summary?.netBalance || 0}
        loading={loading}
      />

      {/* ── Chart + Category Breakdown ─────────────────────── */}
      <div className="dashboard-grid">
        {/* Income vs Expense chart */}
        <div className="card dashboard-chart-card" id="chart-card">
          <h2>Income vs Expenses</h2>
          <p className="card-description">{currentLabel}</p>
          {loading ? (
            <div className="skeleton-line" style={{ width: '100%', height: '60px' }} />
          ) : (
            <IncomeExpenseChart
              totalIncome={summary?.totalIncome || 0}
              totalExpense={summary?.totalExpense || 0}
            />
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card dashboard-recent-card" id="recent-transactions-card">
          <div className="dashboard-card-header">
            <h2>Recent Transactions</h2>
            <Link to="/transactions" className="btn btn-outline btn-sm" id="view-all-txns">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="recent-txn-skeleton">
              {[1, 2, 3].map((i) => (
                <div className="skeleton-line" style={{ width: '100%', height: '44px', marginBottom: '8px' }} key={i} />
              ))}
            </div>
          ) : summary?.recentTransactions?.length > 0 ? (
            <div className="recent-txn-list">
              {summary.recentTransactions.map((txn) => (
                <RecentTxnRow key={txn._id} txn={txn} />
              ))}
            </div>
          ) : (
            <div className="txn-empty" style={{ padding: '32px 16px' }}>
              <div className="txn-empty__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <p className="txn-empty__title">No transactions yet</p>
              <p className="txn-empty__text">
                Start tracking your finances by adding your first transaction.
              </p>
              <Link to="/transactions" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                Add Transaction
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Category Breakdown ─────────────────────────────── */}
      <div className="dashboard-grid">
        <div className="card" id="income-categories-card">
          <h2>
            <span className="category-heading-dot category-heading-dot--income" />
            Income by Category
          </h2>
          {loading ? (
            <div className="skeleton-line" style={{ width: '100%', height: '80px' }} />
          ) : (
            <CategoryList
              categories={summary?.incomeCategories || []}
              type="income"
              total={summary?.totalIncome || 0}
            />
          )}
        </div>
        <div className="card" id="expense-categories-card">
          <h2>
            <span className="category-heading-dot category-heading-dot--expense" />
            Expenses by Category
          </h2>
          {loading ? (
            <div className="skeleton-line" style={{ width: '100%', height: '80px' }} />
          ) : (
            <CategoryList
              categories={summary?.expenseCategories || []}
              type="expense"
              total={summary?.totalExpense || 0}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
