import React, { useState } from 'react';
import TransactionForm from './TransactionForm';

/**
 * Format a date string for display.
 */
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format BDT amount with Taka symbol.
 */
const formatAmount = (amount) => {
  return `৳ ${Number(amount).toLocaleString('en-IN')}`;
};

/**
 * TransactionItem — renders a single transaction with edit/delete capabilities.
 *
 * Props:
 *   transaction  – the transaction object
 *   onUpdate     – async (id, updates) => void
 *   onDelete     – async (id) => void
 */
const TransactionItem = ({ transaction, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = async (formData) => {
    setEditSubmitting(true);
    setError('');
    try {
      await onUpdate(transaction._id, formData);
      setIsEditing(false);
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Failed to update transaction';
      setError(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await onDelete(transaction._id);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete transaction';
      setError(message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
  };

  // Editing mode — show full form
  if (isEditing) {
    return (
      <div className="txn-item txn-item--editing" id={`txn-item-${transaction._id}`}>
        <div className="txn-item__edit-header">
          <h3>Edit Transaction</h3>
        </div>
        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}
        <TransactionForm
          initialData={transaction}
          onSubmit={handleEdit}
          onCancel={handleCancelEdit}
          submitting={editSubmitting}
        />
      </div>
    );
  }

  return (
    <div
      className={`txn-item txn-item--${transaction.type}`}
      id={`txn-item-${transaction._id}`}
    >
      {/* Left indicator bar */}
      <div className="txn-item__indicator" />

      {/* Main content */}
      <div className="txn-item__body">
        <div className="txn-item__top">
          <div className="txn-item__info">
            <span className="txn-item__category">{transaction.category}</span>
            <span className="txn-item__date">{formatDate(transaction.date)}</span>
          </div>
          <span className={`txn-item__amount txn-item__amount--${transaction.type}`}>
            {transaction.type === 'income' ? '+' : '−'} {formatAmount(transaction.amount)}
          </span>
        </div>

        {transaction.description && (
          <p className="txn-item__description">{transaction.description}</p>
        )}

        {error && (
          <div className="alert alert-error txn-item__error" role="alert">{error}</div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm ? (
          <div className="txn-item__delete-confirm">
            <span className="txn-item__delete-text">Delete this transaction?</span>
            <div className="txn-item__delete-actions">
              <button
                className="btn btn-danger btn-sm"
                id={`txn-delete-confirm-${transaction._id}`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="btn-loading">
                    <span className="btn-spinner"></span>
                    Deleting…
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
              <button
                className="btn btn-outline btn-sm"
                id={`txn-delete-cancel-${transaction._id}`}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="txn-item__actions">
            <button
              className="txn-action-btn txn-action-btn--edit"
              id={`txn-edit-${transaction._id}`}
              onClick={() => setIsEditing(true)}
              title="Edit transaction"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              className="txn-action-btn txn-action-btn--delete"
              id={`txn-delete-${transaction._id}`}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete transaction"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionItem;
