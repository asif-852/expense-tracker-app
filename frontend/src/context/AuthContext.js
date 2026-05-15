import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch {
          // Token invalid/expired and refresh failed — clear state
          clearAuthState();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const clearAuthState = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const register = useCallback(async (username, email, password) => {
    setError(null);
    try {
      const data = await authService.register(username, email, password);
      storeTokens(data.accessToken, data.refreshToken);
      const userData = await authService.getMe();
      setUser(userData);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Registration failed';
      setError(message);
      throw err;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await authService.login(email, password);
      storeTokens(data.accessToken, data.refreshToken);
      const userData = await authService.getMe();
      setUser(userData);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid credentials';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Logout API failure is non-blocking
    } finally {
      clearAuthState();
    }
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    setError(null);
    try {
      const data = await authService.updatePassword(currentPassword, newPassword);
      storeTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Password update failed';
      setError(message);
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async (password) => {
    setError(null);
    try {
      const data = await authService.deleteAccount(password);
      clearAuthState();
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Account deletion failed';
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updatePassword,
    deleteAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
