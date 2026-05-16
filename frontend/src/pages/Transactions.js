import React, { useState, useEffect, useCallback } from 'react';
import transactionService from '../services/transactionService';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

const Transactions = () => {
  // ── Transaction list state ──────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Add-transaction panel state ─────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState('');

  // ── Fetch transactions ──────────────────────────────────
  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await transactionService.list({ page, limit: 20, sort: 'date', order: 'desc' });
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── Handlers ────────────────────────────────────────────
  const handlePageChange = (page) => {
    fetchTransactions(page);
    // Scroll to top of list
    document.getElementById('transactions-list-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddTransaction = async (formData) => {
    setAddSubmitting(true);
    setAddSuccess('');
    setError('');
    try {
      await transactionService.create(formData);
      setAddSuccess(`${formData.type === 'income' ? 'Income' : 'Expense'} added successfully!`);
      // Refresh list from page 1 to show the new transaction
      await fetchTransactions(1);
      // Auto-hide success after 3 seconds
      setTimeout(() => setAddSuccess(''), 3000);
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Failed to add transaction';
      setError(message);
      throw err; // Let form keep the data
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleUpdateTransaction = async (id, updates) => {
    await transactionService.update(id, updates);
    // Refresh list at current page
    await fetchTransactions(pagination.page);
  };

  const handleDeleteTransaction = async (id) => {
    await transactionService.delete(id);
    // If we deleted the last item on a page > 1, go to previous page
    const shouldGoBack = transactions.length === 1 && pagination.page > 1;
    await fetchTransactions(shouldGoBack ? pagination.page - 1 : pagination.page);
  };

  return (
    <div className="page-container" id="transactions-page">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1>Transactions</h1>
            <p className="page-subtitle">Manage your income and expenses</p>
          </div>
          <button
            className={`btn ${showAddForm ? 'btn-outline' : 'btn-primary'}`}
            id="toggle-add-form-btn"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setAddSuccess('');
              setError('');
            }}
          >
            {showAddForm ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Transaction
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div className="alert alert-error" id="transactions-error" role="alert">
          {error}
        </div>
      )}

      {/* Add Transaction Panel */}
      {showAddForm && (
        <div className="card txn-add-card" id="add-transaction-card">
          <h2>New Transaction</h2>

          {addSuccess && (
            <div className="alert alert-success" id="add-success" role="alert">
              {addSuccess}
            </div>
          )}

          <TransactionForm
            onSubmit={handleAddTransaction}
            submitting={addSubmitting}
          />
        </div>
      )}

      {/* Transaction List */}
      <div className="card" id="transactions-list-card">
        <TransactionList
          transactions={transactions}
          pagination={pagination}
          loading={loading}
          onPageChange={handlePageChange}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
        />
      </div>
    </div>
  );
};

export default Transactions;
