# ============================================================
#  Expense Tracker API - PowerShell Validation Script
#  Tests all implemented auth endpoints (Iterations 0-3)
#
#  Usage:
#    .\api-validate.ps1
#    .\api-validate.ps1 -BaseUrl "http://localhost:5000/api"
#    .\api-validate.ps1 -Verbose
#
#  Requirements:
#    - Backend running:  cd backend && npm run dev
#    - MongoDB running
# ============================================================

param(
    [string]$BaseUrl = "http://localhost:5000/api",
    [switch]$Verbose
)

# ── Helpers ──────────────────────────────────────────────────

$script:Passed      = 0
$script:Failed      = 0
$script:AccessToken = $null
$script:RefreshToken = $null

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "── $Text" -ForegroundColor Yellow
}

function Write-Pass {
    param([string]$Text)
    Write-Host "  [PASS] $Text" -ForegroundColor Green
    $script:Passed++
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  [FAIL] $Text" -ForegroundColor Red
    $script:Failed++
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [INFO] $Text" -ForegroundColor Gray
}

# Invoke an API endpoint.
# Protected endpoints: pass -AccessToken to send Authorization: Bearer <token>
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body        = $null,
        [string]$AccessToken    = $null,
        [string]$Description    = ""
    )

    $url     = "$BaseUrl$Path"
    $headers = @{ "Content-Type" = "application/json" }

    # All protected routes use the standard RFC 6750 Bearer scheme
    if ($AccessToken) { $headers["Authorization"] = "Bearer $AccessToken" }

    Write-Info "-> $Method $url"

    try {
        $params = @{
            Method          = $Method
            Uri             = $url
            Headers         = $headers
            UseBasicParsing = $true
            ErrorAction     = "Stop"
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }

        $response   = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content    = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue

        if ($Verbose) {
            Write-Host "  Status  : $statusCode"   -ForegroundColor DarkGray
            Write-Host "  Response: $($response.Content)" -ForegroundColor DarkGray
        }

        return [PSCustomObject]@{
            Success    = $true
            StatusCode = $statusCode
            Data       = $content
            Raw        = $response.Content
        }
    }
    catch {
        $statusCode = 0
        $rawBody    = ""

        if ($null -ne $_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        }

        if ($null -ne $_.ErrorDetails -and $_.ErrorDetails.Message -ne "") {
            $rawBody = $_.ErrorDetails.Message
        }
        elseif ($_.Exception -is [System.Net.WebException] -and $null -ne $_.Exception.Response) {
            try {
                $stream  = $_.Exception.Response.GetResponseStream()
                $reader  = New-Object System.IO.StreamReader($stream)
                $rawBody = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
        }

        if ($statusCode -eq 0) {
            Write-Host "  [ERROR] Connection failed: $($_.Exception.Message)" -ForegroundColor Red
            return [PSCustomObject]@{
                Success    = $false
                StatusCode = 0
                Data       = $null
                Raw        = $_.Exception.Message
            }
        }

        $content = $rawBody | ConvertFrom-Json -ErrorAction SilentlyContinue

        if ($Verbose) {
            Write-Host "  Status  : $statusCode" -ForegroundColor DarkGray
            Write-Host "  Response: $rawBody"    -ForegroundColor DarkGray
        }

        return [PSCustomObject]@{
            Success    = $false
            StatusCode = $statusCode
            Data       = $content
            Raw        = $rawBody
        }
    }
}

function Assert-StatusCode {
    param([PSCustomObject]$Response, [int]$Expected, [string]$Label)
    if ($Response.StatusCode -eq $Expected) {
        Write-Pass "$Label -> HTTP $($Response.StatusCode)"
    } else {
        Write-Fail "$Label -> Expected HTTP $Expected, got HTTP $($Response.StatusCode)"
        if ($Response.Raw) { Write-Info "Body: $($Response.Raw)" }
    }
}

function Assert-HasField {
    param([PSCustomObject]$Response, [string]$Field, [string]$Label)
    if ($Response.Data -and $Response.Data.PSObject.Properties[$Field]) {
        Write-Pass "$Label -> field '$Field' present"
    } else {
        Write-Fail "$Label -> field '$Field' missing in response"
    }
}

function Assert-NoField {
    param([PSCustomObject]$Response, [string]$Field, [string]$Label)
    if ($Response.Data -and $Response.Data.PSObject.Properties[$Field]) {
        Write-Fail "$Label -> field '$Field' should NOT be present (security issue)"
    } else {
        Write-Pass "$Label -> field '$Field' correctly absent"
    }
}

# ── Unique test data (timestamp-based so re-runs never conflict) ──
$ts       = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TestUser = @{
    username = "testuser_$ts"
    email    = "test_$ts@example.com"
    password = "TestPass123!"
}

# ============================================================
#  MAIN
# ============================================================

Write-Header "Expense Tracker API Validation"
Write-Info "Base URL  : $BaseUrl"
Write-Info "Test User : $($TestUser.username) / $($TestUser.email)"

# ────────────────────────────────────────────────────────────
#  SECTION 1 — Server Health
# ────────────────────────────────────────────────────────────
Write-Section "1. Server Health Check"

try {
    $rootResp = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -ErrorAction Stop
    if ($rootResp.StatusCode -eq 200) {
        Write-Pass "Server is reachable (HTTP 200)"
    } else {
        Write-Fail "Unexpected status from root: $($rootResp.StatusCode)"
    }
} catch {
    Write-Fail "Server not reachable - is the backend running? ($_)"
    Write-Host ""
    Write-Host "  Start the server with:" -ForegroundColor Yellow
    Write-Host "    cd ..\backend && npm run dev" -ForegroundColor White
    exit 1
}

# ────────────────────────────────────────────────────────────
#  SECTION 2 — Registration
# ────────────────────────────────────────────────────────────
Write-Section "2. POST /auth/register - Valid Registration"

$reg = Invoke-Api -Method "POST" -Path "/auth/register" -Body $TestUser
Assert-StatusCode -Response $reg -Expected 201 -Label "Register new user"
Assert-HasField   -Response $reg -Field "accessToken"  -Label "Register returns accessToken"
Assert-HasField   -Response $reg -Field "refreshToken" -Label "Register returns refreshToken"

if ($reg.Data -and $reg.Data.accessToken) {
    $script:AccessToken  = $reg.Data.accessToken
    $script:RefreshToken = $reg.Data.refreshToken
    Write-Info "Tokens stored for subsequent tests"
}

# Bad registrations ──────────────────────────────────────────
Write-Section "2a. POST /auth/register - Duplicate User"

$dup = Invoke-Api -Method "POST" -Path "/auth/register" -Body $TestUser
Assert-StatusCode -Response $dup -Expected 400 -Label "Duplicate username/email rejected"

Write-Section "2b. POST /auth/register - Missing Email"

$noEmail = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "incomplete_$ts"; password = "TestPass123!"
}
Assert-StatusCode -Response $noEmail -Expected 400 -Label "Missing email rejected"

Write-Section "2c. POST /auth/register - Password Too Short"

$shortPw = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "pwtest_$ts"; email = "pwtest_$ts@example.com"; password = "abc"
}
Assert-StatusCode -Response $shortPw -Expected 400 -Label "Short password rejected"

Write-Section "2d. POST /auth/register - Invalid Email Format"

$badEmail = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "bademail_$ts"; email = "not-an-email"; password = "TestPass123!"
}
Assert-StatusCode -Response $badEmail -Expected 400 -Label "Invalid email format rejected"

Write-Section "2e. POST /auth/register - Missing Username"

$noUser = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    email = "nousername_$ts@example.com"; password = "TestPass123!"
}
Assert-StatusCode -Response $noUser -Expected 400 -Label "Missing username rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 3 — Login
# ────────────────────────────────────────────────────────────
Write-Section "3. POST /auth/login - Valid Credentials"

$login = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = $TestUser.email
    password = $TestUser.password
}
Assert-StatusCode -Response $login -Expected 200     -Label "Login with correct credentials"
Assert-HasField   -Response $login -Field "accessToken"  -Label "Login returns accessToken"
Assert-HasField   -Response $login -Field "refreshToken" -Label "Login returns refreshToken"

if ($login.Data -and $login.Data.accessToken) {
    $script:AccessToken  = $login.Data.accessToken
    $script:RefreshToken = $login.Data.refreshToken
    Write-Info "Tokens refreshed from login response"
}

Write-Section "3a. POST /auth/login - Wrong Password"

$wrongPw = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = $TestUser.email
    password = "WrongPassword!"
}
Assert-StatusCode -Response $wrongPw -Expected 400 -Label "Wrong password rejected"

Write-Section "3b. POST /auth/login - Non-existent Email"

$noUserLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = "ghost_$ts@example.com"
    password = "TestPass123!"
}
Assert-StatusCode -Response $noUserLogin -Expected 400 -Label "Unknown email rejected"

Write-Section "3c. POST /auth/login - Malformed Email"

$badLoginEmail = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = "not-an-email"; password = "TestPass123!"
}
Assert-StatusCode -Response $badLoginEmail -Expected 400 -Label "Malformed email in login rejected"

Write-Section "3d. POST /auth/login - Missing Password"

$noPassword = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = $TestUser.email
}
Assert-StatusCode -Response $noPassword -Expected 400 -Label "Missing password rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 4 — GET /auth/me (Protected Route)
# ────────────────────────────────────────────────────────────
Write-Section "4. GET /auth/me - No Token (must be 401)"

$noToken = Invoke-Api -Method "GET" -Path "/auth/me"
Assert-StatusCode -Response $noToken -Expected 401 -Label "No token -> 401 Unauthorized"

Write-Section "4a. GET /auth/me - Tampered Token (must be 401)"

$fakeToken = Invoke-Api -Method "GET" -Path "/auth/me" -AccessToken "eyJhbGciOiJIUzI1NiJ9.fake.payload"
Assert-StatusCode -Response $fakeToken -Expected 401 -Label "Tampered token -> 401 Unauthorized"

$garbageToken = Invoke-Api -Method "GET" -Path "/auth/me" -AccessToken "notavalidtokenatall"
Assert-StatusCode -Response $garbageToken -Expected 401 -Label "Garbage token -> 401 Unauthorized"

Write-Section "4b. GET /auth/me - Valid Token (must be 200)"

if ($script:AccessToken) {
    $me = Invoke-Api -Method "GET" -Path "/auth/me" -AccessToken $script:AccessToken
    Assert-StatusCode -Response $me -Expected 200     -Label "GET /auth/me with valid token"
    Assert-HasField   -Response $me -Field "username" -Label "/auth/me returns username"
    Assert-HasField   -Response $me -Field "email"    -Label "/auth/me returns email"
    Assert-HasField   -Response $me -Field "_id"      -Label "/auth/me returns _id"
    Assert-NoField    -Response $me -Field "password" -Label "/auth/me does not expose password"
} else {
    Write-Fail "Skipped - no access token available (registration/login failed)"
}

# ────────────────────────────────────────────────────────────
#  SECTION 5 — POST /auth/refresh (Token Rotation)
# ────────────────────────────────────────────────────────────
Write-Section "5. POST /auth/refresh - Valid Token Rotation"

$oldRefreshToken = $script:RefreshToken

if ($script:RefreshToken) {
    $refresh = Invoke-Api -Method "POST" -Path "/auth/refresh" -Body @{
        refreshToken = $script:RefreshToken
    }
    Assert-StatusCode -Response $refresh -Expected 200          -Label "Refresh issues new token pair"
    Assert-HasField   -Response $refresh -Field "accessToken"  -Label "Refresh returns new accessToken"
    Assert-HasField   -Response $refresh -Field "refreshToken" -Label "Refresh returns new refreshToken"

    if ($refresh.Data -and $refresh.Data.accessToken) {
        $script:AccessToken  = $refresh.Data.accessToken
        $script:RefreshToken = $refresh.Data.refreshToken
        Write-Info "Tokens updated from refresh response"
    }
} else {
    Write-Fail "Skipped - no refresh token available"
}

Write-Section "5a. POST /auth/refresh - Reuse Revoked Token (must be 401)"

if ($oldRefreshToken) {
    $reuse = Invoke-Api -Method "POST" -Path "/auth/refresh" -Body @{
        refreshToken = $oldRefreshToken
    }
    Assert-StatusCode -Response $reuse -Expected 401 -Label "Replayed (revoked) refresh token rejected"
} else {
    Write-Fail "Skipped - no old refresh token to replay"
}

Write-Section "5b. POST /auth/refresh - Invalid Token (must be 401)"

$badRefresh = Invoke-Api -Method "POST" -Path "/auth/refresh" -Body @{
    refreshToken = "completelyinvalidtoken"
}
Assert-StatusCode -Response $badRefresh -Expected 401 -Label "Invalid refresh token rejected"

Write-Section "5c. POST /auth/refresh - Missing Token Body (must be 400)"

$missingRefresh = Invoke-Api -Method "POST" -Path "/auth/refresh" -Body @{}
Assert-StatusCode -Response $missingRefresh -Expected 400 -Label "Missing refreshToken field rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 6 — PUT /auth/password (Update Password)
# ────────────────────────────────────────────────────────────
Write-Section "6. PUT /auth/password - Wrong Current Password (must be 400)"

if ($script:AccessToken) {
    $wrongCurrentPw = Invoke-Api -Method "PUT" -Path "/auth/password" -AccessToken $script:AccessToken -Body @{
        currentPassword = "WrongCurrentPassword!"
        newPassword     = "NewPass456!"
    }
    Assert-StatusCode -Response $wrongCurrentPw -Expected 400 -Label "Wrong current password rejected"
} else {
    Write-Fail "Skipped - no access token available"
}

Write-Section "6a. PUT /auth/password - Same Password (must be 400)"

if ($script:AccessToken) {
    $samePw = Invoke-Api -Method "PUT" -Path "/auth/password" -AccessToken $script:AccessToken -Body @{
        currentPassword = $TestUser.password
        newPassword     = $TestUser.password
    }
    Assert-StatusCode -Response $samePw -Expected 400 -Label "Same password as current rejected"
} else {
    Write-Fail "Skipped - no access token available"
}

Write-Section "6b. PUT /auth/password - Valid Password Update"

$newPassword = "UpdatedPass789!"

if ($script:AccessToken) {
    $pwUpdate = Invoke-Api -Method "PUT" -Path "/auth/password" -AccessToken $script:AccessToken -Body @{
        currentPassword = $TestUser.password
        newPassword     = $newPassword
    }
    Assert-StatusCode -Response $pwUpdate -Expected 200          -Label "Password updated successfully"
    Assert-HasField   -Response $pwUpdate -Field "accessToken"  -Label "Password update returns new accessToken"
    Assert-HasField   -Response $pwUpdate -Field "refreshToken" -Label "Password update returns new refreshToken"

    if ($pwUpdate.Data -and $pwUpdate.Data.accessToken) {
        $script:AccessToken  = $pwUpdate.Data.accessToken
        $script:RefreshToken = $pwUpdate.Data.refreshToken
        Write-Info "Tokens updated after password change"
    }
} else {
    Write-Fail "Skipped - no access token available"
}

Write-Section "6c. PUT /auth/password - No Auth Token (must be 401)"

$noAuthPw = Invoke-Api -Method "PUT" -Path "/auth/password" -Body @{
    currentPassword = $TestUser.password
    newPassword     = "NewPass456!"
}
Assert-StatusCode -Response $noAuthPw -Expected 401 -Label "Password update without token -> 401"

# ────────────────────────────────────────────────────────────
#  SECTION 7 — POST /auth/logout
# ────────────────────────────────────────────────────────────
Write-Section "7. POST /auth/logout - Valid Logout"

if ($script:RefreshToken) {
    $logout = Invoke-Api -Method "POST" -Path "/auth/logout" -Body @{
        refreshToken = $script:RefreshToken
    }
    Assert-StatusCode -Response $logout -Expected 200 -Label "Logout succeeds"
    Assert-HasField   -Response $logout -Field "message" -Label "Logout returns message"
} else {
    Write-Fail "Skipped - no refresh token available"
}

Write-Section "7a. POST /auth/logout - Missing Token Body (must be 400)"

$missingLogout = Invoke-Api -Method "POST" -Path "/auth/logout" -Body @{}
Assert-StatusCode -Response $missingLogout -Expected 400 -Label "Missing refreshToken field rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 8 — DELETE /auth/me (Account Deletion)
# ────────────────────────────────────────────────────────────
Write-Section "8. DELETE /auth/me - No Auth Token (must be 401)"

$noAuthDel = Invoke-Api -Method "DELETE" -Path "/auth/me" -Body @{ password = $newPassword }
Assert-StatusCode -Response $noAuthDel -Expected 401 -Label "Account deletion without token -> 401"

Write-Section "8a. DELETE /auth/me - Wrong Password (must be 400)"

if ($script:AccessToken) {
    $wrongDelPw = Invoke-Api -Method "DELETE" -Path "/auth/me" -AccessToken $script:AccessToken -Body @{
        password = "WrongPasswordForDeletion!"
    }
    Assert-StatusCode -Response $wrongDelPw -Expected 400 -Label "Wrong password for deletion rejected"
} else {
    Write-Fail "Skipped - no access token available"
}

Write-Section "8b. DELETE /auth/me - Valid Account Deletion"

if ($script:AccessToken) {
    $del = Invoke-Api -Method "DELETE" -Path "/auth/me" -AccessToken $script:AccessToken -Body @{
        password = $newPassword
    }
    Assert-StatusCode -Response $del -Expected 200    -Label "Account deleted successfully"
    Assert-HasField   -Response $del -Field "message" -Label "Deletion returns confirmation message"
} else {
    Write-Fail "Skipped - no access token available"
}

# ────────────────────────────────────────────────────────────
#  SUMMARY
# ────────────────────────────────────────────────────────────
Write-Header "Test Summary"
$total = $script:Passed + $script:Failed
Write-Host "  Total  : $total"              -ForegroundColor White
Write-Host "  Passed : $($script:Passed)"   -ForegroundColor Green
Write-Host "  Failed : $($script:Failed)"   -ForegroundColor $(if ($script:Failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($script:Failed -eq 0) {
    Write-Host "  All tests passed!" -ForegroundColor Green
} else {
    Write-Host "  Some tests failed. Review output above." -ForegroundColor Red
}
Write-Host ""
