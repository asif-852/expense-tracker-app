import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-container" id="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, <strong>{user?.username}</strong>
        </p>
      </div>

      <div className="card-grid">
        <div className="summary-card summary-card--income" id="summary-income">
          <div className="summary-card__label">Total Income</div>
          <div className="summary-card__amount">৳ 0</div>
        </div>
        <div className="summary-card summary-card--expense" id="summary-expense">
          <div className="summary-card__label">Total Expenses</div>
          <div className="summary-card__amount">৳ 0</div>
        </div>
        <div className="summary-card summary-card--balance" id="summary-balance">
          <div className="summary-card__label">Net Balance</div>
          <div className="summary-card__amount">৳ 0</div>
        </div>
      </div>

      <div className="card" id="recent-transactions-card">
        <h2>Recent Transactions</h2>
        <p className="text-muted">Transaction data will appear here once Iteration 9 is complete.</p>
      </div>
    </div>
  );
};

export default Dashboard;
