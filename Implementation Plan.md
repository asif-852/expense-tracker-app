# Expense Tracker Implementation Plan

## Context

We are building a MERN stack expense tracker with JWT-based authentication, DB-backed refresh tokens, and MongoDB persistence. Users can register, login, manage their account, track income and expenses in BDT, view summaries, and filter their transaction history.

This file is the roadmap. It describes both completed and planned work. `CLAUDE.md` should mirror the current architecture and agent guidance.

## Current Implementation Status

| Iteration | Area | Status |
| --- | --- | --- |
| 0 | Project setup and foundation | Completed |
| 1 | MongoDB connection and User model | Completed |
| 2 | Authentication API foundation | Completed |
| 3 | Auth hardening, sessions, account management | Completed for backend API |
| 4 | Transaction model and CRUD API | Completed |
| 5 | Frontend routing and app shell | Completed |
| 6 | Authentication frontend | Completed |
| 7 | Transaction listing and creation UI | Completed |
| 8 | Transaction editing and deletion UI | Completed |
| 9 | Summary dashboard | Planned |
| 10 | Dynamic category filtering | Planned |
| 11 | Validation, testing, and polish | Planned |
| 12 | Deployment preparation | Planned |
| 13 | Recurring transactions | Later |
| 14 | Import/export | Later |

## Iteration Plan

### Iteration 0: Project Setup and Foundation

Goal: Establish project structure and basic tooling.

- Create backend directory with package.json.
- Create frontend directory with package.json.
- Set up basic Express server.
- Set up basic React app.
- Configure concurrent development script.
- Visible Outcome: Running development servers showing a basic backend response and frontend shell.

### Iteration 1: MongoDB Connection and User Model

Goal: Database connectivity and user data model.

- Connect backend to MongoDB using Mongoose.
- Create User model with username, email, password hash, and timestamps.
- Store passwords hashed with bcrypt.
- Make password excluded by default from User query results.
- Visible Outcome: Backend can connect to MongoDB and create user documents safely.

### Iteration 2: Authentication API Foundation

Goal: User registration, login, and current-user lookup.

- POST /api/auth/register - create user and return an access/refresh token pair.
- POST /api/auth/login - validate credentials and return an access/refresh token pair.
- GET /api/auth/me - get current user info from a valid access token.
- Use `Authorization: Bearer <accessToken>` for protected routes.
- Do not allow users to change username or email after registration.
- Visible Outcome: Users can register, login, and call a protected current-user endpoint.

### Iteration 3: Auth Hardening, Sessions, and Account Management

Goal: Make authentication usable and safer for real users.

- Create protected-route middleware to verify short-lived access tokens.
- Use short-lived access tokens, default `ACCESS_TOKEN_EXPIRES_IN=15m`.
- Add DB-backed refresh tokens with hashed token storage, expiration, revocation timestamp, and TTL cleanup.
- POST /api/auth/refresh - rotate a valid refresh token and return a new access/refresh token pair.
- POST /api/auth/logout - revoke the submitted refresh token; frontend must also clear local auth state.
- PUT /api/auth/password - verify current password, enforce password complexity, save new password, revoke all existing refresh tokens, and return a fresh access/refresh token pair.
- DELETE /api/auth/me - require password confirmation, revoke/delete refresh tokens, delete the user, and later cascade-delete transactions once the Transaction model exists.
- Apply the same password complexity rules everywhere: minimum 8 characters, uppercase letter, lowercase letter, and number.
- Implement centralized error handling and consistent operational errors.
- Visible Outcome: Users can refresh sessions, logout server-side, update password, delete account, and old refresh tokens are invalidated after sensitive account changes.

### Iteration 4: Transaction Model and CRUD API

Goal: Core expense tracking functionality.

- Create Transaction model with amount, type, category, description, date, userId, and timestamps.
- Use BDT as the only supported currency.
- Store transaction amounts as whole integer BDT values.
- Validate transaction type as income or expense.
- Default transaction sort order is most recent first.
- Implement protected REST endpoints:
- GET /api/transactions - list user's transactions with pagination and filters.
- POST /api/transactions - create a transaction.
- PUT /api/transactions/:id - update a transaction owned by the user.
- DELETE /api/transactions/:id - delete a transaction owned by the user.
- Support query parameters for list endpoint: `page`, `limit`, `sort`, `type`, `category`, `from`, `to`, and `search`.
- Ensure every transaction query is scoped to the authenticated user.
- Visible Outcome: Full CRUD operations work via API testing tools, with pagination and user-owned data isolation.

### Iteration 5: Frontend Setup and Routing

Goal: Basic React application structure.

- Set up React Router for client-side routing.
- Create app layout with navigation.
- Set up API service layer for backend communication.
- Create auth context for user state, access token, refresh token, and auth lifecycle actions.
- Create protected route handling for authenticated pages.
- Visible Outcome: Navigable SPA with placeholder pages and working auth-aware routing.

### Iteration 6: Authentication Frontend

Goal: User registration, login, logout, token refresh, and account management UI.

- Create Register page with frontend validation matching backend rules.
- Create Login page with validation.
- Store and update auth state consistently.
- Implement refresh-token flow so expired access tokens can be renewed through POST /api/auth/refresh.
- Implement logout by calling POST /api/auth/logout, clearing frontend auth state, and redirecting away from protected pages.
- Create Account Settings page with update-password form.
- Create delete-account flow with password confirmation and clear warning.
- On password update, replace stored tokens with the fresh access/refresh pair returned by the API.
- On account deletion, clear auth state and redirect to register/login.
- Do not provide username/email change UI.
- Visible Outcome: Users can complete all auth and account-management flows through the frontend.

### Iteration 7: Transaction Listing and Creation UI

Goal: Core expense tracking interface.

- Create Transactions page showing paginated transaction list.
- Show BDT amounts as whole integer values.
- Default UI order is most recent first.
- Create Add Transaction form for income and expense.
- Implement API calls to fetch and create transactions.
- Add formatting for dates and amounts.
- Visible Outcome: Users can view, paginate, and create transactions.

### Iteration 8: Transaction Editing and Deletion UI

Goal: Complete transaction management.

- Implement edit transaction functionality.
- Implement delete transaction with confirmation.
- Update transaction list after mutations.
- Add loading states and error handling.
- Visible Outcome: Users can edit and delete their own transactions through the UI.

### Iteration 9: Summary Dashboard

Goal: Income/expense visualization and summary.

- Create Dashboard/Summary page.
- Calculate total income, total expenses, and net balance.
- Support date ranges such as current month, last month, current year, and custom from/to dates.
- Add backend summary query support with `from` and `to` parameters.
- Display summary cards with BDT formatting.
- Optional: Add a simple chart showing income vs expenses.
- Visible Outcome: Users can view financial summaries for useful date ranges.

### Iteration 10: Dynamic Category Filtering

Goal: Help users find and analyze transactions by category.

- Derive available filter categories dynamically from the user's transactions.
- Allow users to filter by type, category, date range, and search text.
- Keep filtering compatible with paginated transaction API responses.
- Optional later enhancement: allow user-managed custom category presets.
- Visible Outcome: Users can filter transaction history by dynamic categories and other criteria.

### Iteration 11: Validation, Testing, and Polish

Goal: Quality assurance and user experience improvements.

- Add consistent frontend and backend validation for all forms.
- Implement proper user-facing error messages from API responses.
- Add loading, empty, and success states.
- Improve UI styling and responsiveness.
- Add backend tests for auth, refresh tokens, account management, and transaction ownership.
- Add frontend tests for auth forms, protected routes, transaction flows, and dashboard states.
- Visible Outcome: Polished application with clear feedback and meaningful automated coverage.

### Iteration 12: Deployment Preparation

Goal: Production readiness.

- Configure environment variables for development and production.
- Ensure build scripts work for frontend and backend.
- Document deployment process.
- Run audit/build/test checks before release.
- Visible Outcome: Application builds successfully and can be started in a production-like environment.

### Iteration 13: Recurring Transactions

Goal: Support common repeated income and expense patterns later.

- Add recurring transaction rules for salary, rent, subscriptions, and bills.
- Generate or suggest transactions based on recurrence schedule.
- Visible Outcome: Users can reduce manual entry for repeated financial activity.

### Iteration 14: Import and Export

Goal: Give users portability and backup options later.

- Export transactions to CSV.
- Consider CSV import from spreadsheets.
- Visible Outcome: Users can move their data in and out of the app.

## Verification Approach

Each iteration should be verified by:

1. Manual testing of implemented features.
2. API testing with Postman/curl/PowerShell scripts.
3. UI testing for frontend components and flows.
4. Checking security and edge cases.
5. Ensuring code follows established patterns and updates both docs when non-trivial behavior changes.

## Files to be Created or Modified

### Backend

- backend/server.js
- backend/config/database.js
- backend/models/User.js
- backend/models/RefreshToken.js
- backend/models/Transaction.js
- backend/middleware/auth.js
- backend/middleware/validation.js
- backend/middleware/errorHandler.js
- backend/routes/authRoutes.js
- backend/routes/transactionRoutes.js
- backend/routes/summaryRoutes.js
- backend/controllers/authController.js
- backend/controllers/transactionController.js
- backend/controllers/summaryController.js
- backend/utils/passwordUtils.js, if shared password helpers become useful
- backend/package.json
- backend/.env

### Frontend

- frontend/src/index.js
- frontend/src/App.js
- frontend/src/index.css
- frontend/src/routes/AppRoutes.js
- frontend/src/context/AuthContext.js
- frontend/src/services/api.js
- frontend/src/services/authService.js
- frontend/src/services/transactionService.js
- frontend/src/components/layout/Navbar.js
- frontend/src/components/layout/PrivateRoute.js
- frontend/src/pages/Login.js
- frontend/src/pages/Register.js
- frontend/src/pages/AccountSettings.js
- frontend/src/pages/Dashboard.js
- frontend/src/pages/Transactions.js
- frontend/src/components/TransactionForm.js
- frontend/src/components/TransactionList.js
- frontend/src/components/TransactionItem.js
- frontend/src/components/SummaryCards.js
- frontend/package.json
- frontend/.env

## Dependencies

### Backend

- express
- mongoose
- bcryptjs
- jsonwebtoken
- dotenv
- cors
- helmet
- express-validator
- validator

### Frontend

- react
- react-dom
- react-router-dom
- axios
- testing-library packages
- web-vitals

## Environment Variables

Backend:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=replace_with_a_strong_secret
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:3000
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

Frontend:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

## Success Criteria

By the end of all core iterations, users should be able to:

1. Register a new account.
2. Login with credentials.
3. Maintain a session using short-lived access tokens and DB-backed refresh tokens.
4. Logout with server-side refresh token revocation.
5. Update password and invalidate old refresh tokens.
6. Delete their account after password confirmation.
7. View dashboard with BDT income/expense summary.
8. Filter dashboard summaries by useful date ranges.
9. Add income and expense transactions using whole integer BDT amounts.
10. Edit existing transactions.
11. Delete transactions.
12. View paginated transactions sorted most recent first by default.
13. Filter transactions by type, dynamic category, date range, and search text.
14. Have persisted, user-isolated data in MongoDB.
