# Expense Tracker — API Test & Validation Scripts

This folder contains helper scripts to validate all backend API endpoints
across multiple tools and environments. Use whichever method suits you best.

---

## Contents

| File | Tool | Platform |
|------|------|----------|
| `curl-commands.sh` | curl | Linux / macOS / Git Bash (Windows) |
| `api-validate.ps1` | PowerShell (Invoke-WebRequest) | Windows / PowerShell Core |
| `postman-collection.json` | Postman | All platforms |

---

## Prerequisites

1. **Backend server must be running** before executing any script:
   ```
   cd backend
   npm run dev
   ```
   The server defaults to `http://localhost:5000`.

2. **MongoDB must be connected** — check the terminal for:
   ```
   MongoDB Connected: localhost
   ```

---

## 1. curl (`curl-commands.sh`)

### Requirements
- `curl` installed (pre-installed on macOS/Linux; available via Git Bash or WSL on Windows)
- `jq` *(optional)* for pretty-printed JSON output — [https://jqlang.org](https://jqlang.org)

### Run
```
chmod +x curl-commands.sh
./curl-commands.sh
```

### What it tests
| # | Endpoint | Scenario | Expected |
|---|----------|----------|----------|
| 0 | `GET /` | Health check | 200 |
| 1 | `POST /auth/register` | Valid new user | 201 + token |
| 2 | `POST /auth/register` | Duplicate user | 400 |
| 3 | `POST /auth/register` | Missing email | 400 |
| 4 | `POST /auth/register` | Password too short | 400 |
| 5 | `POST /auth/login` | Valid credentials | 200 + token |
| 6 | `POST /auth/login` | Wrong password | 400 |
| 7 | `POST /auth/login` | Unknown user | 400 |
| 8 | `POST /auth/login` | Bad email format | 400 |
| 9 | `GET /auth/me` | No token | 401 |
| 10 | `GET /auth/me` | Garbage token | 401 |
| 11 | `GET /auth/me` | Valid token (auto-captured) | 200 |
| 12 | `GET /auth/me` | Manual token (edit script) | 200 |

### Manual token test
Open the script and replace `PASTE_YOUR_JWT_HERE` with a real token:
```
MANUAL_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Individual curl commands (quick reference)
```
# Register
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}' | jq .

# Login
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq .

# Get current user (replace TOKEN)
curl -s -X GET http://localhost:5000/api/auth/me \
  -H "x-auth-token: TOKEN" | jq .

# Get current user — no token (expect 401)
curl -s -X GET http://localhost:5000/api/auth/me | jq .
```

---

## 2. PowerShell (`api-validate.ps1`)

### Requirements
- Windows PowerShell 5.1+ **or** PowerShell Core 7+ (cross-platform)
- No extra dependencies

### Run
```
# From inside the api-tests folder:
.\api-validate.ps1

# Custom base URL:
.\api-validate.ps1 -BaseUrl "http://localhost:5000/api"

# Verbose mode (print raw responses):
.\api-validate.ps1 -Verbose
```

> **Note for Windows users:** If you get an execution policy error, run:
> ```
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

### What it tests
The PowerShell script runs all the same scenarios as the curl script, plus:
- Asserts that `password` field is **absent** from `GET /auth/me` response (security check)
- Uses timestamp-based unique usernames/emails so tests are idempotent (re-runnable)
- Prints a colour-coded `[PASS]` / `[FAIL]` summary with totals

### Sample output
```
============================================================
  Expense Tracker API Validation
============================================================
  [INFO] Base URL : http://localhost:5000/api
  [INFO] Test User: testuser_1718000000 / test_1718000000@example.com

── 1. Server Health Check
  [PASS] Server is reachable (HTTP 200)

── 2. POST /auth/register – Valid Registration
  [PASS] Register new user → HTTP 201
  [PASS] Register returns token → field 'token' present

  ...

============================================================
  Test Summary
============================================================
  Total  : 18
  Passed : 18
  Failed : 0

  All tests passed! Iterations 0-3 verified.
```

---

## 3. Postman (`postman-collection.json`)

### Import steps
1. Open **Postman**
2. Click **Import** (top-left)
3. Select `postman-collection.json`
4. The collection **"Expense Tracker API"** will appear in your sidebar

### Collection structure
```
Expense Tracker API
├── Auth
│   ├── Register - Valid User          POST /api/auth/register
│   ├── Register - Duplicate           POST /api/auth/register
│   ├── Register - Missing Email       POST /api/auth/register
│   ├── Register - Short Password      POST /api/auth/register
│   ├── Login - Valid Credentials      POST /api/auth/login
│   ├── Login - Wrong Password         POST /api/auth/login
│   ├── Login - Unknown User           POST /api/auth/login
│   ├── Get Me - No Token              GET  /api/auth/me
│   ├── Get Me - Invalid Token         GET  /api/auth/me
│   └── Get Me - Valid Token           GET  /api/auth/me
└── Health
    └── Root Check                     GET  /
```

### Auto-token capture
The **"Register - Valid User"** and **"Login - Valid Credentials"** requests
include a **Tests** script that automatically saves the returned JWT into a
collection variable `{{token}}`, which is then used by **"Get Me - Valid Token"**.

### Environment variables
The collection uses `{{baseUrl}}` (default: `http://localhost:5000/api`).
To change it: **Edit Collection → Variables → baseUrl**.

---

## 4. Using Bruno (alternative to Postman)

[Bruno](https://www.usebruno.com/) is a free, open-source API client that stores
collections as plain files. You can replicate the Postman collection manually
using Bruno's simple `.bru` format. No account required.

---

## Token Header

All protected endpoints use the `x-auth-token` header (not `Authorization: Bearer`).

```
x-auth-token: <your_jwt_here>
```

---

## Iteration 3 — Core Verification Checklist

Per the implementation plan, Iteration 3 is verified when:

- [ ] `GET /auth/me` without a token returns **HTTP 401**
- [ ] `GET /auth/me` with a tampered/garbage token returns **HTTP 401**
- [ ] `GET /auth/me` with a valid token returns **HTTP 200** and user data
- [ ] Registration with bad input returns **HTTP 400** with validation errors
- [ ] Login with wrong credentials returns **HTTP 400**
- [ ] Error responses have a consistent JSON shape (`{ msg }` or `{ errors }`)

Run either script above — all these cases are covered automatically.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Connection refused` | Start the backend: `cd backend && npm run dev` |
| `MongoDB not connected` | Ensure MongoDB is running; check `backend/.env` for `MONGODB_URI` |
| `401` on valid token | Token may have expired (1 h TTL). Log in again to get a fresh token |
| PowerShell execution policy error | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| curl not found on Windows | Use Git Bash, WSL, or switch to the PowerShell script |
| Tests always create same user | The PS1 script uses timestamps; the curl script reuses fixed test data — edit `testuser@example.com` if needed |