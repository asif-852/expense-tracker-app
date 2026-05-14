# Expense Tracker — API Validation Script

This folder contains the PowerShell script used to validate all implemented
backend API endpoints.

---

## File

| File | Tool | Platform |
|------|------|----------|
| `api-validate.ps1` | PowerShell (Invoke-WebRequest) | Windows / PowerShell Core |

---

## Prerequisites

1. **MongoDB must be running.**
2. **Backend server must be running:**
   ```
   cd backend
   npm run dev
   ```
   The server defaults to `http://localhost:5000`.
   Confirm you see:
   ```
   MongoDB Connected: localhost
   Server is running on port 5000
   ```

---

## Running the Script

```powershell
# From the api-tests folder:
.\api-validate.ps1

# Custom base URL:
.\api-validate.ps1 -BaseUrl "http://localhost:5000/api"

# Verbose mode (print raw responses):
.\api-validate.ps1 -Verbose
```

> **Windows execution policy:** If you get a policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> This only affects the current terminal session.

---

## What It Tests

| # | Section | Endpoint | Scenario | Expected |
|---|---------|----------|----------|----------|
| 1 | Health | `GET /` | Server reachable | 200 |
| 2 | Register | `POST /auth/register` | Valid new user | 201 + `accessToken` + `refreshToken` |
| 2a | Register | `POST /auth/register` | Duplicate user | 400 |
| 2b | Register | `POST /auth/register` | Missing email | 400 |
| 2c | Register | `POST /auth/register` | Password too short | 400 |
| 2d | Register | `POST /auth/register` | Invalid email format | 400 |
| 2e | Register | `POST /auth/register` | Missing username | 400 |
| 3 | Login | `POST /auth/login` | Valid credentials | 200 + `accessToken` + `refreshToken` |
| 3a | Login | `POST /auth/login` | Wrong password | 400 |
| 3b | Login | `POST /auth/login` | Unknown email | 400 |
| 3c | Login | `POST /auth/login` | Malformed email | 400 |
| 3d | Login | `POST /auth/login` | Missing password | 400 |
| 4 | Protected | `GET /auth/me` | No token | 401 |
| 4a | Protected | `GET /auth/me` | Tampered/garbage token | 401 |
| 4b | Protected | `GET /auth/me` | Valid token | 200 + user data, no password field |
| 5 | Refresh | `POST /auth/refresh` | Valid token rotation | 200 + new token pair |
| 5a | Refresh | `POST /auth/refresh` | Replay revoked token | 401 (reuse detection) |
| 5b | Refresh | `POST /auth/refresh` | Invalid token string | 401 |
| 5c | Refresh | `POST /auth/refresh` | Missing token body | 400 |
| 6 | Password | `PUT /auth/password` | Wrong current password | 400 |
| 6a | Password | `PUT /auth/password` | Same password as current | 400 |
| 6b | Password | `PUT /auth/password` | Valid update | 200 + new token pair |
| 6c | Password | `PUT /auth/password` | No auth token | 401 |
| 7 | Logout | `POST /auth/logout` | Valid logout | 200 |
| 7a | Logout | `POST /auth/logout` | Missing token body | 400 |
| 8 | Delete | `DELETE /auth/me` | No auth token | 401 |
| 8a | Delete | `DELETE /auth/me` | Wrong password | 400 |
| 8b | Delete | `DELETE /auth/me` | Valid deletion | 200 |

The script uses a timestamp-based username/email (`testuser_<unix_ts>`) so every
run creates a fresh user and never conflicts with previous runs. The test user
is fully deleted at the end of the run (Section 8b).

---

## Authentication

All protected endpoints use the standard `Authorization: Bearer <accessToken>` header.
The script handles this automatically — tokens are captured after Register/Login
and passed to protected requests.

Token response shape from the server:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque hex string>"
}
```

---

## Sample Output

```
============================================================
  Expense Tracker API Validation
============================================================
  [INFO] Base URL  : http://localhost:5000/api
  [INFO] Test User : testuser_1778000000 / test_1778000000@example.com

── 1. Server Health Check
  [PASS] Server is reachable (HTTP 200)

── 2. POST /auth/register - Valid Registration
  [INFO] -> POST http://localhost:5000/api/auth/register
  [PASS] Register new user -> HTTP 201
  [PASS] Register returns accessToken -> field 'accessToken' present
  [PASS] Register returns refreshToken -> field 'refreshToken' present

  ... (all sections) ...

============================================================
  Test Summary
============================================================
  Total  : 35
  Passed : 35
  Failed : 0

  All tests passed!
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Connection refused` | Start the backend: `cd backend && npm run dev` |
| `MongoDB not connected` | Ensure MongoDB service is running |
| `401` on valid token | Access token expired (15 min TTL) — re-run the script |
| Execution policy error | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Tests always fail on Section 2a | Ensure `NODE_ENV` is set correctly in `backend/.env` |
