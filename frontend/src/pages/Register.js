import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const passwordRules = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'One number' },
];

const Register = () => {
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const validate = () => {
    const errors = {};
    const { username, email, password, confirmPassword } = formData;

    // Username
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      errors.username = 'Username is required';
    } else if (trimmedUser.length < 3 || trimmedUser.length > 30) {
      errors.username = 'Username must be between 3 and 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUser)) {
      errors.username = 'Only letters, numbers, and underscores allowed';
    }

    // Email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email';
    }

    // Password
    if (!password) {
      errors.password = 'Password is required';
    } else {
      const failedRules = passwordRules.filter((r) => !r.test(password));
      if (failedRules.length > 0) {
        errors.password = failedRules[0].label;
      }
    }

    // Confirm password
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password
      );
      navigate('/', { replace: true });
    } catch {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  // Count how many password rules pass
  const passedRules = passwordRules.filter((r) => r.test(formData.password)).length;
  const strengthPercent = formData.password ? (passedRules / passwordRules.length) * 100 : 0;
  const strengthColor =
    strengthPercent <= 25
      ? 'var(--color-danger)'
      : strengthPercent <= 50
        ? '#f59e0b'
        : strengthPercent <= 75
          ? '#3b82f6'
          : 'var(--color-income)';

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon auth-icon--register">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1>Create Account</h1>
          <p className="auth-subtitle">Start tracking your expenses</p>
        </div>

        {error && (
          <div className="alert alert-error" id="register-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate id="register-form">
          <div className="form-group">
            <label htmlFor="register-username">Username</label>
            <input
              type="text"
              id="register-username"
              name="username"
              className={`form-control ${fieldErrors.username ? 'form-control--error' : ''}`}
              placeholder="e.g. john_doe"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
            {fieldErrors.username && (
              <span className="field-error">{fieldErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              type="email"
              id="register-email"
              name="email"
              className={`form-control ${fieldErrors.email ? 'form-control--error' : ''}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <input
              type="password"
              id="register-password"
              name="password"
              className={`form-control ${fieldErrors.password ? 'form-control--error' : ''}`}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setShowPasswordRules(true)}
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}

            {/* Password strength bar */}
            {showPasswordRules && formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-bar__fill"
                    style={{
                      width: `${strengthPercent}%`,
                      background: strengthColor,
                    }}
                  />
                </div>
                <ul className="password-rules">
                  {passwordRules.map((rule, i) => (
                    <li
                      key={i}
                      className={`password-rule ${rule.test(formData.password) ? 'password-rule--pass' : ''}`}
                    >
                      <span className="rule-icon">
                        {rule.test(formData.password) ? '✓' : '○'}
                      </span>
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">Confirm Password</label>
            <input
              type="password"
              id="register-confirm-password"
              name="confirmPassword"
              className={`form-control ${fieldErrors.confirmPassword ? 'form-control--error' : ''}`}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            id="register-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="btn-spinner"></span>
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" id="register-login-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
