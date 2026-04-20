# ============================================================
#  Expense Tracker API - PowerShell Validation Script
#  Tests all auth endpoints up through Iteration 3
#  Usage: .\api-validate.ps1
#         .\api-validate.ps1 -BaseUrl "http://localhost:5000/api"
#         .\api-validate.ps1 -Verbose
# ============================================================

param(
    [string]$BaseUrl = "http://localhost:5000/api",
    [switch]$Verbose
)

# ── Helpers ──────────────────────────────────────────────────

$script:Passed  = 0
$script:Failed  = 0
$script:Token   = $null

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

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body      = $null,
        [string]$Token        = $null,
        [string]$Description  = ""
    )

    $url     = "$BaseUrl$Path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["x-auth-token"] = $Token }

    Write-Info "-> $Method $url"

    try {
        $params = @{
            Method             = $Method
            Uri                = $url
            Headers            = $headers
            UseBasicParsing    = $true
            ErrorAction        = "Stop"
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }

        $response    = Invoke-WebRequest @params
        $statusCode  = $response.StatusCode
        $content     = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue

        if ($Verbose) {
            Write-Host "  Status  : $statusCode" -ForegroundColor DarkGray
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
        # Unified handler for both:
        #   PS 5.1 -> System.Net.WebException   (response via GetResponseStream)
        #   PS 7+  -> HttpResponseException      (body in $_.ErrorDetails.Message)
        $statusCode = 0
        $rawBody    = ""

        # Get the HTTP status code -- works for both exception types
        if ($null -ne $_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        }

        # PS7+: response body is pre-populated in ErrorDetails.Message
        if ($null -ne $_.ErrorDetails -and
            $null -ne $_.ErrorDetails.Message -and
            $_.ErrorDetails.Message -ne "") {
            $rawBody = $_.ErrorDetails.Message
        }
        # PS5.1: must read the response stream manually
        elseif ($_.Exception -is [System.Net.WebException] -and
                $null -ne $_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $rawBody = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
        }

        # StatusCode still 0 means a connection-level failure (not an HTTP error)
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
            Write-Host "  Response: $rawBody"        -ForegroundColor DarkGray
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
    param(
        [PSCustomObject]$Response,
        [int]$Expected,
        [string]$Label
    )
    if ($Response.StatusCode -eq $Expected) {
        Write-Pass "$Label -> HTTP $($Response.StatusCode)"
    } else {
        Write-Fail "$Label -> Expected HTTP $Expected, got HTTP $($Response.StatusCode)"
        if ($Response.Raw) { Write-Info "Body: $($Response.Raw)" }
    }
}

function Assert-HasField {
    param(
        [PSCustomObject]$Response,
        [string]$Field,
        [string]$Label
    )
    if ($Response.Data -and $Response.Data.PSObject.Properties[$Field]) {
        Write-Pass "$Label -> field '$Field' present"
    } else {
        Write-Fail "$Label -> field '$Field' missing in response"
    }
}

# ── Unique test data (timestamp-based) ───────────────────────
$ts          = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TestUser    = @{
    username = "testuser_$ts"
    email    = "test_$ts@example.com"
    password = "TestPass123!"
}

# ============================================================
#  MAIN
# ============================================================

Write-Header "Expense Tracker API Validation"
Write-Info "Base URL : $BaseUrl"
Write-Info "Test User: $($TestUser.username) / $($TestUser.email)"

# ────────────────────────────────────────────────────────────
#  SECTION 1 - Server Health
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
#  SECTION 2 - Registration
# ────────────────────────────────────────────────────────────
Write-Section "2. POST /auth/register - Valid Registration"

$reg = Invoke-Api -Method "POST" -Path "/auth/register" -Body $TestUser
Assert-StatusCode -Response $reg -Expected 201 -Label "Register new user"
Assert-HasField   -Response $reg -Field "token" -Label "Register returns token"
if ($reg.Data -and $reg.Data.token) {
    $script:Token = $reg.Data.token
    Write-Info "Token stored for subsequent tests"
}

# ── Bad registrations ────────────────────────────────────────
Write-Section "2a. POST /auth/register - Duplicate User"

$dup = Invoke-Api -Method "POST" -Path "/auth/register" -Body $TestUser
Assert-StatusCode -Response $dup -Expected 400 -Label "Duplicate email/username rejected"

Write-Section "2b. POST /auth/register - Missing Fields"

$noEmail = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "incomplete_$ts"; password = "pass123"
}
Assert-StatusCode -Response $noEmail -Expected 400 -Label "Missing email rejected"

$shortPw = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "pwtest_$ts"; email = "pwtest_$ts@example.com"; password = "abc"
}
Assert-StatusCode -Response $shortPw -Expected 400 -Label "Short password (< 6 chars) rejected"

$badEmail = Invoke-Api -Method "POST" -Path "/auth/register" -Body @{
    username = "bademail_$ts"; email = "not-an-email"; password = "validpass"
}
Assert-StatusCode -Response $badEmail -Expected 400 -Label "Invalid email format rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 3 - Login
# ────────────────────────────────────────────────────────────
Write-Section "3. POST /auth/login - Valid Credentials"

$login = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = $TestUser.email
    password = $TestUser.password
}
Assert-StatusCode -Response $login -Expected 200 -Label "Login with correct credentials"
Assert-HasField   -Response $login -Field "token" -Label "Login returns token"
if ($login.Data -and $login.Data.token) {
    $script:Token = $login.Data.token
    Write-Info "Token refreshed from login response"
}

# ── Bad logins ───────────────────────────────────────────────
Write-Section "3a. POST /auth/login - Wrong Password"

$wrongPw = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = $TestUser.email
    password = "WrongPassword!"
}
Assert-StatusCode -Response $wrongPw -Expected 400 -Label "Wrong password rejected"

Write-Section "3b. POST /auth/login - Non-existent Email"

$noUser = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = "ghost_$ts@example.com"
    password = "somepassword"
}
Assert-StatusCode -Response $noUser -Expected 400 -Label "Unknown email rejected"

Write-Section "3c. POST /auth/login - Malformed Body"

$badLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = "not-an-email"; password = "x"
}
Assert-StatusCode -Response $badLogin -Expected 400 -Label "Malformed login body rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 4 - GET /auth/me (Protected Route)
# ────────────────────────────────────────────────────────────
Write-Section "4. GET /auth/me - With Valid Token"

if ($script:Token) {
    $me = Invoke-Api -Method "GET" -Path "/auth/me" -Token $script:Token
    Assert-StatusCode -Response $me -Expected 200     -Label "GET /auth/me with valid token"
    Assert-HasField   -Response $me -Field "username" -Label "/auth/me returns username"
    Assert-HasField   -Response $me -Field "email"    -Label "/auth/me returns email"

    if ($me.Data -and -not $me.Data.PSObject.Properties["password"]) {
        Write-Pass "/auth/me does NOT expose password field"
    } else {
        Write-Fail "/auth/me EXPOSED the password field - security issue!"
    }
} else {
    Write-Fail "Skipped - no token available (registration/login failed)"
}

# ── No token ─────────────────────────────────────────────────
Write-Section "4a. GET /auth/me - No Token (Iteration 3 Core Check)"

$noToken = Invoke-Api -Method "GET" -Path "/auth/me"
Assert-StatusCode -Response $noToken -Expected 401 -Label "No token -> 401 Unauthorized"

# ── Fake token ───────────────────────────────────────────────
Write-Section "4b. GET /auth/me - Invalid / Tampered Token"

$fakeToken = Invoke-Api -Method "GET" -Path "/auth/me" -Token "eyJhbGciOiJIUzI1NiJ9.fake.payload"
Assert-StatusCode -Response $fakeToken -Expected 401 -Label "Tampered token -> 401 Unauthorized"

$garbageToken = Invoke-Api -Method "GET" -Path "/auth/me" -Token "notavalidtokenatall"
Assert-StatusCode -Response $garbageToken -Expected 401 -Label "Garbage token -> 401 Unauthorized"

# ────────────────────────────────────────────────────────────
#  SECTION 5 - Summary
# ────────────────────────────────────────────────────────────
Write-Header "Test Summary"
$total = $script:Passed + $script:Failed
Write-Host "  Total  : $total" -ForegroundColor White
Write-Host "  Passed : $($script:Passed)" -ForegroundColor Green
Write-Host "  Failed : $($script:Failed)" -ForegroundColor $(if ($script:Failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($script:Failed -eq 0) {
    Write-Host "  All tests passed! Iterations 0-3 verified." -ForegroundColor Green
} else {
    Write-Host "  Some tests failed. Review output above." -ForegroundColor Red
}
Write-Host ""