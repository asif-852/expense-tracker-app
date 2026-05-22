import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

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

        <div className="navbar-right-group">
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

          <button
            className="theme-toggle-btn"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          <button
            className="navbar-toggle"
            id="navbar-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
