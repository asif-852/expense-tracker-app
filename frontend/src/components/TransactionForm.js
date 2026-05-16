import React, { useState, useEffect } from 'react';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Housing', 'Utilities', 'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Other'];

/**
 * TransactionForm — reusable form for creating and editing transactions.
 *
 * Props:
 *   initialData  – object with existing values when editing (null for create)
 *   onSubmit     – async (formData) => void
 *   onCancel     – () => void (only shown when editing)
 *   submitting   – boolean
 */
const TransactionForm = ({ initialData = null, onSubmit, onCancel, submitting = false }) => {
  const isEditing = !!initialData;

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        type: initialData.type || 'expense',
        amount: String(initialData.amount || ''),
        category: initialData.category || '',
        description: initialData.description || '',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const validate = () => {
    const errs = {};

    if (!form.amount) {
      errs.amount = 'Amount is required';
    } else {
      const num = Number(form.amount);
      if (!Number.isInteger(num) || num <= 0) {
        errs.amount = 'Amount must be a positive whole number';
      }
    }

    if (!form.category.trim()) {
      errs.category = 'Category is required';
    } else if (form.category.trim().length > 50) {
      errs.category = 'Category must be 50 characters or less';
    }

    if (form.description.length > 200) {
      errs.description = 'Description must be 200 characters or less';
    }

    if (!form.date) {
      errs.date = 'Date is required';
    }

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeToggle = (type) => {
    setForm((prev) => ({ ...prev, type, category: '' }));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSubmit({
      type: form.type,
      amount: parseInt(form.amount, 10),
      category: form.category.trim(),
      description: form.description.trim(),
      date: form.date,
    });

    // Reset form after create (not edit — parent handles closing)
    if (!isEditing) {
      setForm({
        type: form.type,
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setErrors({});
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="transaction-form"
      id={isEditing ? 'edit-transaction-form' : 'add-transaction-form'}
    >
      {/* Type toggle */}
      <div className="type-toggle" id="type-toggle">
        <button
          type="button"
          className={`type-toggle__btn type-toggle__btn--income ${form.type === 'income' ? 'active' : ''}`}
          id="type-toggle-income"
          onClick={() => handleTypeToggle('income')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
          Income
        </button>
        <button
          type="button"
          className={`type-toggle__btn type-toggle__btn--expense ${form.type === 'expense' ? 'active' : ''}`}
          id="type-toggle-expense"
          onClick={() => handleTypeToggle('expense')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          Expense
        </button>
      </div>

      {/* Amount + Date row */}
      <div className="form-row">
        <div className="form-group form-group--grow">
          <label htmlFor="txn-amount">Amount (৳)</label>
          <div className="input-with-prefix">
            <span className="input-prefix">৳</span>
            <input
              type="number"
              id="txn-amount"
              name="amount"
              className={`form-control input-prefixed ${errors.amount ? 'form-control--error' : ''}`}
              placeholder="0"
              value={form.amount}
              onChange={handleChange}
              min="1"
              step="1"
            />
          </div>
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="txn-date">Date</label>
          <input
            type="date"
            id="txn-date"
            name="date"
            className={`form-control ${errors.date ? 'form-control--error' : ''}`}
            value={form.date}
            onChange={handleChange}
          />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label htmlFor="txn-category">Category</label>
        <input
          type="text"
          id="txn-category"
          name="category"
          className={`form-control ${errors.category ? 'form-control--error' : ''}`}
          placeholder="e.g. Food, Salary, Transport"
          value={form.category}
          onChange={handleChange}
          list="category-suggestions"
          autoComplete="off"
        />
        <datalist id="category-suggestions">
          {categories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
        {errors.category && <span className="field-error">{errors.category}</span>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="txn-description">Description (optional)</label>
        <input
          type="text"
          id="txn-description"
          name="description"
          className={`form-control ${errors.description ? 'form-control--error' : ''}`}
          placeholder="Add a note"
          value={form.description}
          onChange={handleChange}
          maxLength={200}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      {/* Submit / Cancel */}
      <div className="form-actions">
        <button
          type="submit"
          className={`btn ${form.type === 'income' ? 'btn-income' : 'btn-expense'} btn-block`}
          id={isEditing ? 'edit-txn-submit' : 'add-txn-submit'}
          disabled={submitting}
        >
          {submitting ? (
            <span className="btn-loading">
              <span className="btn-spinner"></span>
              {isEditing ? 'Saving…' : 'Adding…'}
            </span>
          ) : (
            <>
              {isEditing ? 'Save Changes' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}`}
            </>
          )}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            className="btn btn-outline btn-block"
            id="edit-txn-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
