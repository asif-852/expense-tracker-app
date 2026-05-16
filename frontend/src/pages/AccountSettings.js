import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const passwordRules = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'One number' },
];

const AccountSettings = () => {
  const { user, updatePassword, deleteAccount, error, clearError } = useAuth();
  const navigate = useNavigate();

  // ── Password update state ───────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // ── Delete account state ────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  // ── Password update ─────────────────────────────────────
  const validatePassword = () => {
    const errors = {};
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      const failedRules = passwordRules.filter((r) => !r.test(newPassword));
      if (failedRules.length > 0) {
        errors.newPassword = failedRules[0].label;
      }
    }

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setPasswordSuccess('');

    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password updated successfully. All other sessions have been signed out.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      // Error is set in AuthContext, but we can also show field-level from API
      const apiMessage =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        '';
      if (apiMessage) {
        setPasswordErrors({ currentPassword: apiMessage });
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // ── Delete account ──────────────────────────────────────
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Password is required to confirm deletion');
      return;
    }

    setDeleteSubmitting(true);
    try {
      await deleteAccount(deletePassword);
      navigate('/register', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Account deletion failed';
      setDeleteError(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeletePassword('');
    setDeleteError('');
  };

  return (
    <div className="page-container" id="account-settings-page">
      <div className="page-header">
        <h1>Account Settings</h1>
        <p className="page-subtitle">
          Signed in as <strong>{user?.username}</strong> ({user?.email})
        </p>
      </div>

      {/* ── Update Password Card ─────────────────────────── */}
      <div className="card" id="password-update-card">
        <h2>Update Password</h2>
        <p className="card-description">
          After updating, all other sessions will be signed out.
        </p>

        {passwordSuccess && (
          <div className="alert alert-success" id="password-success" role="alert">
            {passwordSuccess}
          </div>
        )}

        {error && !passwordSuccess && (
          <div className="alert alert-error" id="password-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} noValidate id="password-update-form">
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              type="password"
              id="current-password"
              name="currentPassword"
              className={`form-control ${passwordErrors.currentPassword ? 'form-control--error' : ''}`}
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              autoComplete="current-password"
            />
            {passwordErrors.currentPassword && (
              <span className="field-error">{passwordErrors.currentPassword}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              name="newPassword"
              className={`form-control ${passwordErrors.newPassword ? 'form-control--error' : ''}`}
              placeholder="Create a new password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              autoComplete="new-password"
            />
            {passwordErrors.newPassword && (
              <span className="field-error">{passwordErrors.newPassword}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-new-password"
              name="confirmNewPassword"
              className={`form-control ${passwordErrors.confirmNewPassword ? 'form-control--error' : ''}`}
              placeholder="Re-enter new password"
              value={passwordForm.confirmNewPassword}
              onChange={handlePasswordChange}
              autoComplete="new-password"
            />
            {passwordErrors.confirmNewPassword && (
              <span className="field-error">{passwordErrors.confirmNewPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            id="password-update-btn"
            disabled={passwordSubmitting}
          >
            {passwordSubmitting ? (
              <span className="btn-loading">
                <span className="btn-spinner"></span>
                Updating…
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>

      {/* ── Delete Account Card ──────────────────────────── */}
      <div className="card card--danger" id="delete-account-card">
        <h2>Delete Account</h2>
        <p className="card-description">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!deleteConfirmOpen ? (
          <button
            className="btn btn-danger"
            id="delete-account-trigger"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete My Account
          </button>
        ) : (
          <div className="delete-confirm" id="delete-confirm-section">
            <div className="delete-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                This will permanently delete your account, all transactions, and sign you out.
                Enter your password to confirm.
              </span>
            </div>

            {deleteError && (
              <div className="alert alert-error" id="delete-error" role="alert">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} noValidate id="delete-account-form">
              <div className="form-group">
                <label htmlFor="delete-password">Password</label>
                <input
                  type="password"
                  id="delete-password"
                  className="form-control"
                  placeholder="Enter your password to confirm"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  autoComplete="current-password"
                />
              </div>

              <div className="delete-actions">
                <button
                  type="submit"
                  className="btn btn-danger"
                  id="delete-confirm-btn"
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? (
                    <span className="btn-loading">
                      <span className="btn-spinner"></span>
                      Deleting…
                    </span>
                  ) : (
                    'Permanently Delete'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  id="delete-cancel-btn"
                  onClick={handleCancelDelete}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
