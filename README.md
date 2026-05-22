# 💰 Expense Tracker

A full-stack personal finance management app built with the **MERN stack** (MongoDB, Express, React, Node.js). Track income and expenses, visualize spending habits by category, and manage your account — all behind a secure JWT authentication system with token rotation.

---

## ✨ Features at a Glance

| Area | What it does |
|---|---|
| **Authentication** | Register, login, logout with access + refresh token pair |
| **Token Security** | Short-lived access tokens (15 min) + rotating refresh tokens stored & hashed in DB |
| **Dashboard** | Income/expense summary cards, visual bar chart, category breakdowns, recent transactions |
| **Date Filtering** | This Month, Last Month, Last 30 Days, This Year, All Time, or custom date range |
| **Transactions** | Add, edit, delete income/expense entries with category, description, and date |
| **Pagination** | Server-side pagination (20 per page, up to 100) with sort and filter support |
| **Account Settings** | Change password (invalidates all other sessions) or permanently delete account |
| **Security** | Helmet headers, strict CORS, bcrypt hashing, express-validator on all inputs |

---

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express 5** — REST API server
- **MongoDB** + **Mongoose** — database and ODM
- **JSON Web Tokens** (`jsonwebtoken`) — stateless auth; access tokens + hashed refresh tokens
- **bcryptjs** — password hashing
- **Helmet** — HTTP security headers
- **express-validator** — input validation and sanitization
- **dotenv** — environment variable management

### Frontend
- **React 19** — UI library
- **React Router v7** — client-side routing with protected routes
- **Axios** — HTTP client with request/response interceptors
- **Context API** (`AuthContext`) — global auth state management
- **PWA-ready** — built with `cra-template-pwa`, includes service worker

---

## 🏗 Project Structure

```
expense-tracker/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js         # Register, login, refresh, logout, password, delete
│   │   ├── transactionController.js  # CRUD + filtering/pagination/search
│   │   └── summaryController.js      # Aggregated totals & category breakdowns
│   ├── middleware/
│   │   ├── auth.js          # JWT verification middleware
│   │   └── errorHandler.js  # Centralised AppError class + global handler
│   ├── models/
│   │   ├── User.js          # Email/username/password with pre-save bcrypt hook
│   │   ├── Transaction.js   # Amount, type, category, description, date + compound indexes
│   │   └── RefreshToken.js  # Hashed token, expiry, revocation timestamp
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── transactionRoutes.js # /api/transactions/*
│   │   └── summaryRoutes.js     # /api/summary
│   └── server.js        # App bootstrap, CORS, Helmet, route wiring
│
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.js   # Auth state, token storage, auto-refresh
        ├── services/
        │   ├── api.js           # Axios instance + silent token-refresh interceptor
        │   ├── authService.js
        │   ├── transactionService.js
        │   └── summaryService.js
        ├── pages/
        │   ├── Dashboard.js     # Summary, chart, category lists, recent txns
        │   ├── Transactions.js  # Add/edit/delete + paginated list
        │   ├── AccountSettings.js
        │   ├── Login.js
        │   └── Register.js
        └── components/
            ├── SummaryCards.js
            ├── TransactionForm.js
            ├── TransactionList.js
            └── TransactionItem.js
```

---

## 🔐 Authentication Design

The auth system uses a **dual-token strategy** — a pattern common in production applications:

1. **Access Token** — short-lived JWT (15 min default), sent as `Authorization: Bearer` header
2. **Refresh Token** — long-lived (7 days), stored as a SHA-256 hash in MongoDB

When an access token expires, the Axios response interceptor **silently refreshes** it in the background. Concurrent requests during a refresh are queued and replayed once the new token is issued. Reusing a revoked refresh token triggers **revocation of all tokens** for that user — a defence against theft.

Password changes also revoke all existing refresh tokens, forcing all other sessions to re-authenticate.

---

## 📊 API Endpoints

### Auth — `/api/auth`
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create account (validated username, email, strong password) |
| `POST` | `/login` | Public | Authenticate and receive token pair |
| `POST` | `/refresh` | Public | Rotate refresh token, issue new access token |
| `POST` | `/logout` | Public | Revoke refresh token |
| `GET` | `/me` | Private | Get current user profile |
| `PUT` | `/password` | Private | Update password (revokes all sessions) |
| `DELETE` | `/me` | Private | Delete account + all data (password-confirmed) |

### Transactions — `/api/transactions`
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/` | Private | List transactions (pagination, sort, filter by type/category/date/search) |
| `POST` | `/` | Private | Create transaction |
| `PUT` | `/:id` | Private | Update transaction (user-scoped) |
| `DELETE` | `/:id` | Private | Delete transaction (user-scoped) |

### Summary — `/api/summary`
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/` | Private | Aggregated totals, category breakdowns, recent transactions (optional date range) |

---

## ⚡ Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas connection string)

### 1. Clone & Install

```bash
git clone <repo-url>
cd expense-tracker
npm run install:all
```

### 2. Configure Environment

**`backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your_strong_jwt_secret_here
ALLOWED_ORIGIN=http://localhost:3000
PORT=5000
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

**`frontend/.env`**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Run in Development

```bash
npm run dev
```

This starts both the backend (`localhost:5000`) and frontend (`localhost:3000`) concurrently.

---

## 🧪 Key Implementation Highlights

- **Compound MongoDB Indexes** on `{ userId, date }` and `{ userId, type, date }` for efficient user-scoped, sorted queries
- **Parallel MongoDB Aggregations** in the summary endpoint — type totals, category breakdowns, and recent transactions fetched in a single `Promise.all`
- **Regex-safe text search** — user input is escaped before being compiled into a MongoDB regex, preventing injection
- **Allowlisted sort fields** — only `date`, `amount`, and `category` are accepted as sort keys, preventing query injection
- **Request queuing** during token refresh — concurrent 401 responses don't trigger multiple refresh calls; they queue and replay
- **Server only starts after DB connects** — `connectDB()` is awaited before `app.listen()`, preventing the app from serving requests without a database
- **Missing env-var guard** — the server validates all required environment variables at startup and exits with a clear error if any are absent

---

## 📝 License

MIT
