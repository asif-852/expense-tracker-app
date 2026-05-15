import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" id="navbar-brand">
          <span className="brand-icon">৳</span>
          <span className="brand-text">ExpenseTracker</span>
        </Link>

        <button
          className="navbar-toggle"
          id="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
        </button>

        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`} id="navbar-menu">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-dashboard"
                onClick={() => setMenuOpen(false)}
                end
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/transactions"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-transactions"
                onClick={() => setMenuOpen(false)}
              >
                Transactions
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-account"
                onClick={() => setMenuOpen(false)}
              >
                Account
              </NavLink>
              <div className="nav-user-section">
                <span className="nav-username" id="nav-username">{user?.username}</span>
                <button
                  className="btn btn-outline btn-sm"
                  id="nav-logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-login"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="btn btn-primary btn-sm"
                id="nav-register"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
