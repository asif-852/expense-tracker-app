import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';

// Mock the auth service to avoid real API calls in tests
jest.mock('./services/authService', () => ({
  __esModule: true,
  default: {
    getMe: jest.fn().mockRejectedValue(new Error('No token')),
  },
}));

test('renders the app without crashing', () => {
  render(<App />);
  // The navbar brand should always be visible
  expect(screen.getByText('ExpenseTracker')).toBeInTheDocument();
});
