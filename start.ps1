# ClawManager – One-click start via PowerShell (no Docker required)
# Works on Windows (PowerShell 5+), Linux and macOS (PowerShell 7+).
#
# Usage:
#   Windows:  Right-click → "Run with PowerShell"  -OR-  .\start.ps1
#   Linux/macOS:  pwsh ./start.ps1
#
# Environment overrides (set before running):
#   $env:PORT      – listening port (default: 8000)
#   $env:DATA_DIR  – SQLite data directory (default: <repo>/data)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Port      = if ($env:PORT)     { $env:PORT }     else { "8000" }
$DataDir   = if ($env:DATA_DIR) { $env:DATA_DIR } else { Join-Path $ScriptDir "data" }

Write-Host ""
Write-Host "  +=========================================+" -ForegroundColor Cyan
Write-Host "  |       ClawManager v1.0                  |" -ForegroundColor Cyan
Write-Host "  |   OpenClaw AI Management Platform       |" -ForegroundColor Cyan
Write-Host "  +=========================================+" -ForegroundColor Cyan
Write-Host ""

# ── Helper ────────────────────────────────────────────────────────────────────
function Test-Command($cmd) {
    return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# ── Python check ─────────────────────────────────────────────────────────────
$Python = $null
foreach ($candidate in @("python3", "python", "py")) {
    if (Test-Command $candidate) {
        $ver = & $candidate -c "import sys; print(sys.version_info.major)" 2>$null
        if ($ver -ge 3) { $Python = $candidate; break }
    }
}
if (-not $Python) {
    Write-Host "X  Python 3 not found." -ForegroundColor Red
    Write-Host "   Install Python 3.11+: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}
Write-Host ("+  $(& $Python --version)") -ForegroundColor Green

# ── Node check ───────────────────────────────────────────────────────────────
if (-not (Test-Command "node")) {
    Write-Host "X  Node.js not found." -ForegroundColor Red
    Write-Host "   Install Node 18+: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host ("+  Node $(node --version)") -ForegroundColor Green

if (-not (Test-Command "npm")) {
    Write-Host "X  npm not found (it ships with Node.js)." -ForegroundColor Red
    exit 1
}

# ── Install Python dependencies ───────────────────────────────────────────────
Write-Host ""
Write-Host "-> Installing backend dependencies..." -ForegroundColor Cyan
& $Python -m pip install --upgrade -r (Join-Path $ScriptDir "backend\requirements.txt") -q
Write-Host "+  Backend dependencies ready" -ForegroundColor Green

# ── Build frontend ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "-> Installing frontend dependencies and building..." -ForegroundColor Cyan
Push-Location (Join-Path $ScriptDir "frontend")
try {
    & npm install --silent
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
} finally {
    Pop-Location
}
Write-Host "+  Frontend built" -ForegroundColor Green

# ── Launch ────────────────────────────────────────────────────────────────────
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

$FrontendDist = Join-Path $ScriptDir "frontend\dist"
# SQLAlchemy requires forward-slash paths
$DbPath = (Join-Path $DataDir "clawmanager.db") -replace "\\", "/"
$DatabaseUrl = "sqlite:///$DbPath"

Write-Host ""
Write-Host "  Starting ClawManager on port $Port..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open:     http://localhost:$Port" -ForegroundColor White
Write-Host "  API Docs: http://localhost:$Port/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

Push-Location (Join-Path $ScriptDir "backend")
try {
    $env:FRONTEND_DIST = $FrontendDist
    $env:DATABASE_URL  = $DatabaseUrl
    $env:DATA_DIR      = $DataDir
    & $Python -m uvicorn main:app --host 0.0.0.0 --port $Port
} finally {
    Pop-Location
}
