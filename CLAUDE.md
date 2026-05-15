# CLAUDE.md

This file guides Claude Code and other AI agents working in this repository.

## Project Overview

This is a MERN stack expense tracker using MongoDB, Express, React, Node.js, JWT access tokens, and DB-backed refresh tokens. Users can register, login, refresh sessions, logout, update password, delete their account, track BDT income/expenses, and view summaries.

This file describes the current architecture plus planned roadmap context. `Implementation Plan.md` owns the iteration roadmap.

## Current vs Planned Status

| Area | Status | Notes |
| --- | --- | --- |
| Backend project setup | Implemented | Express server, MongoDB connection, env validation, security middleware |
| User model | Implemented | Username/email/password hash with password excluded by default |
| RefreshToken model | Implemented | Hashed DB-backed refresh tokens with revocation and TTL cleanup |
| Auth API | Implemented | Register, login, refresh, logout, get me, update password, delete account |
| Transaction API | Implemented | CRUD with pagination, filters, search, ownership isolation |
| Frontend app shell | Implemented | React Router, AuthContext, Navbar, PrivateRoute, API service with auto-refresh |
| Frontend auth UI | Planned | See Iteration 6 |
| Transaction UI | Planned | See Iterations 7 and 8 |
| Dashboard/summary UI | Planned | See Iteration 9 |
| Dynamic category filtering | Planned | See Iteration 10 |
| Recurring transactions | Later | See Iteration 13 |
| Import/export | Later | See Iteration 14 |

Agents must not assume planned files already exist. Before editing, inspect the current repository state and update this file plus `Implementation Plan.md` for non-trivial behavior changes.

## Consistency Guidelines for Agents

Before making any change to this codebase, read every file directly or indirectly affected by that change. This project spans models, route validators, controllers, middleware, frontend forms, context, services, docs, and API test assets.

### Pre-change checklist

1. Read the relevant existing files first.
2. Identify every layer the change touches: model, route validator, controller, middleware, API service, frontend form, context, tests, and docs.
3. Apply changes consistently across all affected layers in the same task.
4. Keep `CLAUDE.md` and `Implementation Plan.md` current for non-trivial endpoint, model, business-rule, or workflow changes.
5. Match existing style and error-handling patterns.

## Development Commands

### Backend

```bash
cd backend
npm install
npm run dev
npm start
npm test
```

### Frontend

```bash
cd frontend
npm install
npm start
npm run build
npm test
```

### Full Stack

```bash
npm install
npm run dev
npm run build
```

## Project Structure

```text
/backend
  /config         # Database/configuration files
  /controllers    # Request handlers
  /middleware     # Auth, errors, validation-related middleware
  /models         # User, RefreshToken, planned Transaction
  /routes         # API route definitions
  /utils          # Shared helpers if needed
  server.js       # Backend entry point
  package.json    # Backend dependencies and scripts

/frontend
  /public         # Static assets
  /src
    /components   # Reusable UI components
    /context      # Planned auth/app state context
    /hooks        # Planned custom hooks
    /pages        # Planned page components
    /routes       # Planned route configuration
    /services     # Planned API service calls
    /utils        # Planned frontend utilities
    App.js        # Main App component
    index.js      # Frontend entry point
  package.json    # Frontend dependencies and scripts
```

## Key Architecture

### Authentication and Sessions

- Access tokens are JWTs signed with `JWT_SECRET`.
- Access tokens are short-lived; default `ACCESS_TOKEN_EXPIRES_IN=15m`.
- Protected routes use `Authorization: Bearer <accessToken>`.
- Refresh tokens are random opaque tokens returned to the client and stored hashed in MongoDB.
- Refresh tokens have `expiresAt`, `revokedAt`, and TTL cleanup.
- Refresh tokens rotate on `POST /api/auth/refresh`.
- Logout revokes the submitted refresh token and the frontend must clear local auth state.
- Password update revokes all existing refresh tokens for that user, then returns a fresh access/refresh pair.
- Account deletion removes/revokes refresh tokens and deletes the user.
- Old access tokens may remain valid until their short expiry after password change/logout.
- Username and email are immutable after registration; do not add profile update UI/endpoints unless the product decision changes.

### Data Models

- **User**: username, email, password hash, timestamps.
- **RefreshToken**: user, tokenHash, expiresAt, revokedAt, timestamps.
- **Transaction**: amount (whole integer BDT), type (income/expense), category, description, date, userId, timestamps.

Transaction rules:

- Currency is BDT only.
- Amounts are whole integer BDT values.
- Type is income or expense.
- Default sort order is most recent first.
- All transaction queries must be scoped to the authenticated user.

### API Endpoints

Auth:

- `POST /api/auth/register` - register user; returns `{ accessToken, refreshToken }`.
- `POST /api/auth/login` - login user; returns `{ accessToken, refreshToken }`.
- `POST /api/auth/refresh` - rotate refresh token; returns new `{ accessToken, refreshToken }`.
- `POST /api/auth/logout` - revoke submitted refresh token.
- `GET /api/auth/me` - get current user info, protected.
- `PUT /api/auth/password` - update password, protected; revokes old refresh tokens and returns fresh tokens.
- `DELETE /api/auth/me` - delete account with password confirmation, protected.

Transactions:

- `GET /api/transactions` - paginated list with `page`, `limit`, `sort`, `order`, `type`, `category`, `from`, `to`, `search`.
- `POST /api/transactions` - create transaction.
- `PUT /api/transactions/:id` - update owned transaction.
- `DELETE /api/transactions/:id` - delete owned transaction.

Summary, planned:

- `GET /api/summary` - income/expense summary with optional `from` and `to` date range.

## State Management Plan

- Use React Context API for authentication state.
- Track current user, access token, refresh token, loading state, and auth errors.
- API service layer should attach access tokens to protected requests.
- API service layer should call refresh endpoint when access token expires.
- Logout should call the backend logout endpoint and clear frontend state.
- Local component state is fine for forms and page-specific UI state.

## Code Quality and Standards

- Use CommonJS in the backend unless the project deliberately migrates.
- Use Express 5 async error forwarding; do not wrap controllers in `try/catch` only to call `next(error)`.
- Use centralized `AppError` and `errorHandler` for operational errors.
- Validate inputs in route validators and models where appropriate.
- Keep frontend and backend validation rules aligned.
- Follow existing formatting. Add a real Prettier config before claiming/enforcing Prettier.
- Add tests when implementing core behavior, especially auth/session flows and transaction ownership.

## Common Development Tasks

1. Adding a backend endpoint:
   - Update route validators, controller, model if needed, API docs, and API tests.

2. Adding frontend behavior:
   - Update services, context if needed, page/component UI, validation, tests, and docs.

3. Changing auth behavior:
   - Update token issuance, route behavior, auth context plan/implementation, API tests, and both docs.

4. Changing transaction rules:
   - Update model schema, validators, controllers, frontend forms, filters, summaries, and both docs.

## Environment Variables

Backend `.env`:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=replace_with_a_strong_secret
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:3000
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

Frontend `.env`:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

## Getting Started

1. Ensure MongoDB is running locally or update `MONGODB_URI`.
2. Install dependencies from root with `npm install`, or install separately in `backend` and `frontend`.
3. Start development with `npm run dev` from root, or run backend/frontend separately.
4. Access frontend at `http://localhost:3000` and backend at `http://localhost:5000`.
