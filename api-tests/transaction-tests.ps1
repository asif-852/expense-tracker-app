# ============================================================
#  Expense Tracker API - Transaction CRUD Validation Script
#  Tests Iteration 4: Transaction Model and CRUD API
#
#  Usage:
#    .\transaction-tests.ps1
#    .\transaction-tests.ps1 -BaseUrl "http://localhost:5000/api"
#    .\transaction-tests.ps1 -Verbose
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

function Assert-FieldEquals {
    param([PSCustomObject]$Response, [string]$Field, $Expected, [string]$Label)
    if ($Response.Data -and $Response.Data.PSObject.Properties[$Field]) {
        $actual = $Response.Data.$Field
        if ($actual -eq $Expected) {
            Write-Pass "$Label -> '$Field' = '$Expected'"
        } else {
            Write-Fail "$Label -> '$Field' expected '$Expected', got '$actual'"
        }
    } else {
        Write-Fail "$Label -> field '$Field' missing"
    }
}

# ── Test data ────────────────────────────────────────────────
$ts       = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TestUser = @{
    username = "txnuser_$ts"
    email    = "txn_$ts@example.com"
    password = "TestPass123!"
}

# Second user for ownership isolation tests
$OtherUser = @{
    username = "other_$ts"
    email    = "other_$ts@example.com"
    password = "OtherPass123!"
}

# ============================================================
#  MAIN
# ============================================================

Write-Header "Transaction CRUD API Validation"
Write-Info "Base URL  : $BaseUrl"
Write-Info "Test User : $($TestUser.username)"

# ── Server health ───────────────────────────────────────────
Write-Section "0. Server Health Check"

try {
    $rootResp = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -ErrorAction Stop
    if ($rootResp.StatusCode -eq 200) {
        Write-Pass "Server is reachable (HTTP 200)"
    } else {
        Write-Fail "Unexpected status: $($rootResp.StatusCode)"
    }
} catch {
    Write-Fail "Server not reachable - is the backend running?"
    exit 1
}

# ── Register + Login ────────────────────────────────────────
Write-Section "1. Setup - Register Test User"

$reg = Invoke-Api -Method "POST" -Path "/auth/register" -Body $TestUser
Assert-StatusCode -Response $reg -Expected 201 -Label "Register test user"

if ($reg.Data -and $reg.Data.accessToken) {
    $script:AccessToken  = $reg.Data.accessToken
    $script:RefreshToken = $reg.Data.refreshToken
    Write-Info "Tokens stored"
}

# Register second user for ownership tests
$reg2 = Invoke-Api -Method "POST" -Path "/auth/register" -Body $OtherUser
$otherAccessToken = $null
if ($reg2.Data -and $reg2.Data.accessToken) {
    $otherAccessToken = $reg2.Data.accessToken
    Write-Info "Other user registered"
}

# ────────────────────────────────────────────────────────────
#  SECTION 2 — No Auth (must be 401)
# ────────────────────────────────────────────────────────────
Write-Section "2. GET /transactions - No Auth Token (must be 401)"

$noAuth = Invoke-Api -Method "GET" -Path "/transactions"
Assert-StatusCode -Response $noAuth -Expected 401 -Label "List without token -> 401"

Write-Section "2a. POST /transactions - No Auth Token (must be 401)"

$noAuthPost = Invoke-Api -Method "POST" -Path "/transactions" -Body @{
    amount = 1000; type = "income"; category = "Salary"
}
Assert-StatusCode -Response $noAuthPost -Expected 401 -Label "Create without token -> 401"

# ────────────────────────────────────────────────────────────
#  SECTION 3 — Create Transactions
# ────────────────────────────────────────────────────────────
Write-Section "3. POST /transactions - Create Income"

$income = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount      = 50000
    type        = "income"
    category    = "Salary"
    description = "May salary"
    date        = "2026-05-01T00:00:00Z"
}
Assert-StatusCode  -Response $income -Expected 201     -Label "Create income transaction"
Assert-HasField    -Response $income -Field "_id"      -Label "Response has _id"
Assert-HasField    -Response $income -Field "userId"   -Label "Response has userId"
Assert-FieldEquals -Response $income -Field "amount"   -Expected 50000   -Label "Amount correct"
Assert-FieldEquals -Response $income -Field "type"     -Expected "income" -Label "Type correct"
Assert-FieldEquals -Response $income -Field "category" -Expected "Salary" -Label "Category correct"

$incomeId = $null
if ($income.Data) { $incomeId = $income.Data._id }

Write-Section "3a. POST /transactions - Create Expense"

$expense = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount      = 1500
    type        = "expense"
    category    = "Food"
    description = "Lunch"
    date        = "2026-05-02T00:00:00Z"
}
Assert-StatusCode  -Response $expense -Expected 201      -Label "Create expense transaction"
Assert-FieldEquals -Response $expense -Field "type"      -Expected "expense" -Label "Type is expense"

$expenseId = $null
if ($expense.Data) { $expenseId = $expense.Data._id }

Write-Section "3b. POST /transactions - Create More for Pagination"

# Create a few more transactions
for ($i = 1; $i -le 3; $i++) {
    $extra = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
        amount   = (100 * $i)
        type     = "expense"
        category = "Transport"
        description = "Trip $i"
        date     = "2026-05-0${i}T12:00:00Z"
    }
}
Write-Info "Created 3 extra transactions for pagination tests"

# ────────────────────────────────────────────────────────────
#  SECTION 4 — Validation Errors on Create
# ────────────────────────────────────────────────────────────
Write-Section "4. POST /transactions - Missing amount (must be 400)"

$noAmount = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    type = "income"; category = "Salary"
}
Assert-StatusCode -Response $noAmount -Expected 400 -Label "Missing amount rejected"

Write-Section "4a. POST /transactions - Invalid type (must be 400)"

$badType = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount = 1000; type = "transfer"; category = "Misc"
}
Assert-StatusCode -Response $badType -Expected 400 -Label "Invalid type rejected"

Write-Section "4b. POST /transactions - Missing category (must be 400)"

$noCat = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount = 1000; type = "income"
}
Assert-StatusCode -Response $noCat -Expected 400 -Label "Missing category rejected"

Write-Section "4c. POST /transactions - Negative amount (must be 400)"

$negAmt = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount = -500; type = "expense"; category = "Food"
}
Assert-StatusCode -Response $negAmt -Expected 400 -Label "Negative amount rejected"

Write-Section "4d. POST /transactions - Zero amount (must be 400)"

$zeroAmt = Invoke-Api -Method "POST" -Path "/transactions" -AccessToken $script:AccessToken -Body @{
    amount = 0; type = "expense"; category = "Food"
}
Assert-StatusCode -Response $zeroAmt -Expected 400 -Label "Zero amount rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 5 — List Transactions
# ────────────────────────────────────────────────────────────
Write-Section "5. GET /transactions - List All"

$list = Invoke-Api -Method "GET" -Path "/transactions" -AccessToken $script:AccessToken
Assert-StatusCode -Response $list -Expected 200            -Label "List transactions"
Assert-HasField   -Response $list -Field "transactions"    -Label "Has transactions array"
Assert-HasField   -Response $list -Field "pagination"      -Label "Has pagination object"

if ($list.Data -and $list.Data.pagination) {
    $total = $list.Data.pagination.total
    if ($total -eq 5) {
        Write-Pass "Pagination total = 5 (correct)"
    } else {
        Write-Fail "Pagination total expected 5, got $total"
    }
}

Write-Section "5a. GET /transactions?type=income - Filter by Type"

$incomeList = Invoke-Api -Method "GET" -Path "/transactions?type=income" -AccessToken $script:AccessToken
Assert-StatusCode -Response $incomeList -Expected 200 -Label "Filter by income"
if ($incomeList.Data -and $incomeList.Data.pagination.total -eq 1) {
    Write-Pass "Only 1 income transaction returned"
} else {
    Write-Fail "Expected 1 income transaction"
}

Write-Section "5b. GET /transactions?category=Food - Filter by Category"

$foodList = Invoke-Api -Method "GET" -Path "/transactions?category=Food" -AccessToken $script:AccessToken
Assert-StatusCode -Response $foodList -Expected 200 -Label "Filter by category"
if ($foodList.Data -and $foodList.Data.pagination.total -eq 1) {
    Write-Pass "Only 1 Food transaction returned"
} else {
    Write-Fail "Expected 1 Food transaction"
}

Write-Section "5c. GET /transactions?search=Lunch - Search"

$searchList = Invoke-Api -Method "GET" -Path "/transactions?search=Lunch" -AccessToken $script:AccessToken
Assert-StatusCode -Response $searchList -Expected 200 -Label "Search for 'Lunch'"
if ($searchList.Data -and $searchList.Data.pagination.total -ge 1) {
    Write-Pass "Search returned results"
} else {
    Write-Fail "Search returned no results"
}

Write-Section "5d. GET /transactions?page=1&limit=2 - Pagination"

$pagedList = Invoke-Api -Method "GET" -Path "/transactions?page=1&limit=2" -AccessToken $script:AccessToken
Assert-StatusCode -Response $pagedList -Expected 200 -Label "Paginated list"
if ($pagedList.Data -and $pagedList.Data.transactions.Count -eq 2) {
    Write-Pass "Page 1 returned 2 items"
} else {
    Write-Fail "Expected 2 items on page 1"
}
if ($pagedList.Data -and $pagedList.Data.pagination.pages -eq 3) {
    Write-Pass "Total pages = 3 (5 items / 2 per page)"
} else {
    Write-Fail "Expected 3 total pages"
}

Write-Section "5e. GET /transactions?from=...&to=... - Date Range"

$dateList = Invoke-Api -Method "GET" -Path "/transactions?from=2026-05-01T00:00:00Z&to=2026-05-01T23:59:59Z" -AccessToken $script:AccessToken
Assert-StatusCode -Response $dateList -Expected 200 -Label "Date range filter"
if ($dateList.Data -and $dateList.Data.pagination.total -ge 1) {
    Write-Pass "Date range returned results"
} else {
    Write-Fail "Date range returned no results"
}

# ────────────────────────────────────────────────────────────
#  SECTION 6 — Update Transaction
# ────────────────────────────────────────────────────────────
Write-Section "6. PUT /transactions/:id - Update Transaction"

if ($incomeId) {
    $update = Invoke-Api -Method "PUT" -Path "/transactions/$incomeId" -AccessToken $script:AccessToken -Body @{
        amount      = 55000
        description = "May salary (revised)"
    }
    Assert-StatusCode  -Response $update -Expected 200   -Label "Update transaction"
    Assert-FieldEquals -Response $update -Field "amount" -Expected 55000 -Label "Amount updated"
} else {
    Write-Fail "Skipped - no income transaction ID"
}

Write-Section "6a. PUT /transactions/:id - Invalid Type (must be 400)"

if ($incomeId) {
    $badUpdate = Invoke-Api -Method "PUT" -Path "/transactions/$incomeId" -AccessToken $script:AccessToken -Body @{
        type = "transfer"
    }
    Assert-StatusCode -Response $badUpdate -Expected 400 -Label "Invalid type on update rejected"
}

Write-Section "6b. PUT /transactions/:id - Invalid ID (must be 400)"

$badIdUpdate = Invoke-Api -Method "PUT" -Path "/transactions/notavalidid" -AccessToken $script:AccessToken -Body @{
    amount = 999
}
Assert-StatusCode -Response $badIdUpdate -Expected 400 -Label "Invalid ObjectId rejected"

Write-Section "6c. PUT /transactions/:id - Non-existent ID (must be 404)"

$fakeId = "666666666666666666666666"
$notFound = Invoke-Api -Method "PUT" -Path "/transactions/$fakeId" -AccessToken $script:AccessToken -Body @{
    amount = 999
}
Assert-StatusCode -Response $notFound -Expected 404 -Label "Non-existent transaction -> 404"

# ────────────────────────────────────────────────────────────
#  SECTION 7 — Ownership Isolation
# ────────────────────────────────────────────────────────────
Write-Section "7. Ownership - Other user cannot see transactions"

if ($otherAccessToken) {
    $otherList = Invoke-Api -Method "GET" -Path "/transactions" -AccessToken $otherAccessToken
    Assert-StatusCode -Response $otherList -Expected 200 -Label "Other user list succeeds"
    if ($otherList.Data -and $otherList.Data.pagination.total -eq 0) {
        Write-Pass "Other user sees 0 transactions (isolation works)"
    } else {
        Write-Fail "Other user should see 0 transactions"
    }
}

Write-Section "7a. Ownership - Other user cannot update our transaction"

if ($otherAccessToken -and $incomeId) {
    $otherUpdate = Invoke-Api -Method "PUT" -Path "/transactions/$incomeId" -AccessToken $otherAccessToken -Body @{
        amount = 1
    }
    Assert-StatusCode -Response $otherUpdate -Expected 404 -Label "Other user cannot update our transaction"
}

Write-Section "7b. Ownership - Other user cannot delete our transaction"

if ($otherAccessToken -and $expenseId) {
    $otherDelete = Invoke-Api -Method "DELETE" -Path "/transactions/$expenseId" -AccessToken $otherAccessToken
    Assert-StatusCode -Response $otherDelete -Expected 404 -Label "Other user cannot delete our transaction"
}

# ────────────────────────────────────────────────────────────
#  SECTION 8 — Delete Transaction
# ────────────────────────────────────────────────────────────
Write-Section "8. DELETE /transactions/:id - Delete Transaction"

if ($expenseId) {
    $del = Invoke-Api -Method "DELETE" -Path "/transactions/$expenseId" -AccessToken $script:AccessToken
    Assert-StatusCode -Response $del -Expected 200    -Label "Delete transaction"
    Assert-HasField   -Response $del -Field "message" -Label "Delete returns message"
}

Write-Section "8a. DELETE /transactions/:id - Already Deleted (must be 404)"

if ($expenseId) {
    $delAgain = Invoke-Api -Method "DELETE" -Path "/transactions/$expenseId" -AccessToken $script:AccessToken
    Assert-StatusCode -Response $delAgain -Expected 404 -Label "Re-delete -> 404"
}

Write-Section "8b. DELETE /transactions/:id - Invalid ID (must be 400)"

$badIdDel = Invoke-Api -Method "DELETE" -Path "/transactions/notavalidid" -AccessToken $script:AccessToken
Assert-StatusCode -Response $badIdDel -Expected 400 -Label "Invalid ObjectId on delete rejected"

# ────────────────────────────────────────────────────────────
#  SECTION 9 — Cleanup: Verify count after delete
# ────────────────────────────────────────────────────────────
Write-Section "9. Verify Count After Delete"

$finalList = Invoke-Api -Method "GET" -Path "/transactions" -AccessToken $script:AccessToken
if ($finalList.Data -and $finalList.Data.pagination.total -eq 4) {
    Write-Pass "After deleting 1, total is 4 (correct)"
} else {
    $t = if ($finalList.Data) { $finalList.Data.pagination.total } else { "N/A" }
    Write-Fail "Expected 4 transactions after delete, got $t"
}

# ────────────────────────────────────────────────────────────
#  SECTION 10 — Cascade Delete on Account Deletion
# ────────────────────────────────────────────────────────────
Write-Section "10. Account Deletion Cascades Transactions"

$del = Invoke-Api -Method "DELETE" -Path "/auth/me" -AccessToken $script:AccessToken -Body @{
    password = $TestUser.password
}
Assert-StatusCode -Response $del -Expected 200 -Label "Account deleted"

# Clean up other user too
if ($otherAccessToken) {
    Invoke-Api -Method "DELETE" -Path "/auth/me" -AccessToken $otherAccessToken -Body @{
        password = $OtherUser.password
    } | Out-Null
    Write-Info "Other test user cleaned up"
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
