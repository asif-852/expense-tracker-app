import React from 'react';

const AccountSettings = () => {
  return (
    <div className="page-container" id="account-settings-page">
      <div className="page-header">
        <h1>Account Settings</h1>
        <p className="page-subtitle">Manage your account</p>
      </div>

      <div className="card" id="password-update-card">
        <h2>Update Password</h2>
        <p className="text-muted">
          Password update form will be built in Iteration 6.
        </p>
      </div>

      <div className="card card--danger" id="delete-account-card">
        <h2>Delete Account</h2>
        <p className="text-muted">
          Account deletion flow will be built in Iteration 6.
        </p>
      </div>
    </div>
  );
};

export default AccountSettings;
