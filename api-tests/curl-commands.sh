#!/usr/bin/env bash
# =============================================================================
# Expense Tracker API - curl Validation Script
# =============================================================================
# Usage:
#   chmod +x curl-commands.sh
#   ./curl-commands.sh
#
# Works from: WSL, Git Bash, macOS Terminal, Linux
# The script auto-detects WSL2 and tries the Windows host IP if localhost
# is not reachable (common WSL2 networking behaviour).
#
# Requirements:
#   - curl installed
#   - jq installed (optional, for pretty JSON output: https://jqlang.org)
#   - Backend server running (npm run dev inside /backend)
# =============================================================================

DIVIDER="─────────────────────────────────────────────────────────────"
TOKEN=""
TMPFILE=""

# ── Helpers ──────────────────────────────────────────────────────────────────

pretty() {
  if command -v jq &>/dev/null; then
    echo "$1" | jq .
  else
    echo "$1"
  fi
}

print_header() {
  echo ""
  echo "$DIVIDER"
  echo "  $1"
  echo "$DIVIDER"
}

print_result() {
  local label="$1"
  local http_code="$2"
  local body="$3"

  echo "  -> $label"
  echo "  HTTP Status : $http_code"
  echo "  Response    :"
  pretty "$body"
  echo ""
}

# Run curl, capture status + body safely into a temp file
do_curl() {
  # Usage: do_curl <extra curl args...>
  # Returns: sets CURL_STATUS and CURL_BODY globals
  > "$TMPFILE"   # always reset the file first so cat never fails
  CURL_STATUS=$(curl -s -o "$TMPFILE" -w "%{http_code}" --connect-timeout 5 "$@")
  CURL_BODY=$(cat "$TMPFILE")
}

# =============================================================================
# 0. Resolve BASE_URL — handle WSL2 where localhost != Windows host
# =============================================================================

BASE_URL="http://localhost:5000/api"
HEALTH_URL="http://localhost:5000/"
TMPFILE=$(mktemp)     # portable temp file, cleaned up on exit
trap 'rm -f "$TMPFILE"' EXIT

print_header "Checking server connectivity..."

# First try localhost
if curl -sf --connect-timeout 3 "$HEALTH_URL" > /dev/null 2>&1; then
  echo "  Server reachable at localhost:5000"
else
  # WSL2: the Windows host has a different IP, found in /etc/resolv.conf
  WSL_HOST=""
  if grep -qi microsoft /proc/version 2>/dev/null; then
    WSL_HOST=$(grep nameserver /etc/resolv.conf 2>/dev/null | awk '{print $2}' | head -1)
  fi

  if [ -n "$WSL_HOST" ] && curl -sf --connect-timeout 3 "http://$WSL_HOST:5000/" > /dev/null 2>&1; then
    echo "  WSL2 detected. Using Windows host IP: $WSL_HOST"
    BASE_URL="http://$WSL_HOST:5000/api"
    HEALTH_URL="http://$WSL_HOST:5000/"
  else
    echo ""
    echo "  ERROR: Cannot reach the backend server."
    echo "  Make sure it is running:"
    echo "    cd ../backend && npm run dev"
    echo ""
    echo "  If you are in WSL2 and the server is on Windows, also check:"
    echo "    1. Windows Firewall allows port 5000"
    echo "    2. Or run the server inside WSL directly"
    rm -f "$TMPFILE"
    exit 1
  fi
fi

echo "  BASE_URL = $BASE_URL"

# =============================================================================
# 0. Health Check
# =============================================================================
print_header "0. Health Check -- GET /"

do_curl "$HEALTH_URL"
print_result "GET /" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 1. Register -- valid user
# =============================================================================
print_header "1. Register -- POST /auth/register (valid payload)"

do_curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"testuser@example.com","password":"password123"}'
print_result "POST /auth/register" "$CURL_STATUS" "$CURL_BODY"

if [ "$CURL_STATUS" = "201" ]; then
  if command -v jq &>/dev/null; then
    TOKEN=$(echo "$CURL_BODY" | jq -r '.token')
  else
    TOKEN=$(echo "$CURL_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  fi
  echo "  Token captured from registration."
fi

# =============================================================================
# 2. Register -- duplicate user (expect 400)
# =============================================================================
print_header "2. Register -- POST /auth/register (duplicate -> expect 400)"

do_curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"testuser@example.com","password":"password123"}'
print_result "POST /auth/register (duplicate)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 3. Register -- missing email (expect 400)
# =============================================================================
print_header "3. Register -- POST /auth/register (missing email -> expect 400)"

do_curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"noEmailUser","password":"password123"}'
print_result "POST /auth/register (missing email)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 4. Register -- short password (expect 400)
# =============================================================================
print_header "4. Register -- POST /auth/register (short password -> expect 400)"

do_curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"weakpassuser","email":"weak@example.com","password":"abc"}'
print_result "POST /auth/register (short password)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 5. Login -- valid credentials
# =============================================================================
print_header "5. Login -- POST /auth/login (valid credentials)"

do_curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}'
print_result "POST /auth/login" "$CURL_STATUS" "$CURL_BODY"

if [ "$CURL_STATUS" = "200" ]; then
  if command -v jq &>/dev/null; then
    TOKEN=$(echo "$CURL_BODY" | jq -r '.token')
  else
    TOKEN=$(echo "$CURL_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  fi
  echo "  Token refreshed from login."
fi

# =============================================================================
# 6. Login -- wrong password (expect 400)
# =============================================================================
print_header "6. Login -- POST /auth/login (wrong password -> expect 400)"

do_curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"wrongpassword"}'
print_result "POST /auth/login (wrong password)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 7. Login -- non-existent user (expect 400)
# =============================================================================
print_header "7. Login -- POST /auth/login (unknown user -> expect 400)"

do_curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ghost@example.com","password":"password123"}'
print_result "POST /auth/login (unknown user)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 8. Login -- invalid email format (expect 400)
# =============================================================================
print_header "8. Login -- POST /auth/login (bad email format -> expect 400)"

do_curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"password123"}'
print_result "POST /auth/login (bad email)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 9. Get Me -- NO token (expect 401)
# =============================================================================
print_header "9. Get Current User -- GET /auth/me (no token -> expect 401)"

do_curl -X GET "$BASE_URL/auth/me"
print_result "GET /auth/me (no token)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 10. Get Me -- invalid token (expect 401)
# =============================================================================
print_header "10. Get Current User -- GET /auth/me (invalid token -> expect 401)"

do_curl -X GET "$BASE_URL/auth/me" \
  -H "x-auth-token: this.is.garbage"
print_result "GET /auth/me (invalid token)" "$CURL_STATUS" "$CURL_BODY"

# =============================================================================
# 11. Get Me -- valid token (expect 200)
# =============================================================================
print_header "11. Get Current User -- GET /auth/me (valid token -> expect 200)"

if [ -z "$TOKEN" ]; then
  echo "  No token available — register/login must succeed first."
else
  do_curl -X GET "$BASE_URL/auth/me" \
    -H "x-auth-token: $TOKEN"
  print_result "GET /auth/me (valid token)" "$CURL_STATUS" "$CURL_BODY"
fi

# =============================================================================
# 12. Manual token test -- paste your own token here
# =============================================================================
print_header "12. Manual Token Test (edit MANUAL_TOKEN in this script)"

MANUAL_TOKEN="PASTE_YOUR_JWT_HERE"

if [ "$MANUAL_TOKEN" = "PASTE_YOUR_JWT_HERE" ]; then
  echo "  MANUAL_TOKEN not set. Open the script and replace the placeholder."
else
  do_curl -X GET "$BASE_URL/auth/me" \
    -H "x-auth-token: $MANUAL_TOKEN"
  print_result "GET /auth/me (manual token)" "$CURL_STATUS" "$CURL_BODY"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "$DIVIDER"
echo "  All curl tests completed."
if [ -n "$TOKEN" ]; then
  echo "  TOKEN in use: ${TOKEN:0:40}..."
else
  echo "  TOKEN in use: (none captured)"
fi
echo "$DIVIDER"
echo ""