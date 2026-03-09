@echo off
:: ClawManager – One-click start for Windows (no Docker required)
:: Double-click this file or run it from Command Prompt / PowerShell.
setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if not defined DATA_DIR set "DATA_DIR=%SCRIPT_DIR%data"
if not defined PORT set PORT=8000

echo.
echo   +=========================================+
echo   ^|       ClawManager v1.0                  ^|
echo   ^|   OpenClaw AI Management Platform       ^|
echo   +=========================================+
echo.

:: ── Python check ─────────────────────────────────────────────────────────────
set PYTHON=
for %%C in (python py python3) do (
  if "!PYTHON!"=="" (
    %%C --version >nul 2>&1 && set PYTHON=%%C
  )
)
if "!PYTHON!"=="" (
  echo X  Python 3 not found.
  echo    Install Python 3.11+: https://www.python.org/downloads/
  pause
  exit /b 1
)
for /f "tokens=*" %%V in ('!PYTHON! --version 2^>^&1') do echo ^+  %%V

:: ── Node check ───────────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
  echo X  Node.js not found.
  echo    Install Node 18+: https://nodejs.org/
  pause
  exit /b 1
)
for /f %%V in ('node --version') do echo ^+  Node %%V

:: ── Install Python dependencies ───────────────────────────────────────────────
echo.
echo ^> Installing backend dependencies...
!PYTHON! -m pip install --upgrade -r "%SCRIPT_DIR%backend\requirements.txt" -q
if errorlevel 1 (
  echo X  pip install failed. Check your Python installation.
  pause
  exit /b 1
)
echo ^+  Backend dependencies ready

:: ── Build frontend ────────────────────────────────────────────────────────────
echo.
echo ^> Installing frontend dependencies and building...
cd /d "%SCRIPT_DIR%frontend"
call npm install --silent
if errorlevel 1 (
  echo X  npm install failed.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo X  Frontend build failed.
  pause
  exit /b 1
)
cd /d "%SCRIPT_DIR%"
echo ^+  Frontend built

:: ── Launch ────────────────────────────────────────────────────────────────────
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

set "FRONTEND_DIST=%SCRIPT_DIR%frontend\dist"
:: SQLAlchemy requires forward slashes even on Windows
set "DB_PATH=%DATA_DIR%\clawmanager.db"
set "DB_PATH_FWD=%DB_PATH:\=/%"
set "DATABASE_URL=sqlite:///%DB_PATH_FWD%"

echo.
echo   Starting ClawManager on port %PORT%...
echo.
echo   Open:     http://localhost:%PORT%
echo   API Docs: http://localhost:%PORT%/docs
echo.
echo   Press Ctrl+C to stop
echo.

cd /d "%SCRIPT_DIR%backend"
set "DATABASE_URL=%DATABASE_URL%"
set "DATA_DIR=%DATA_DIR%"
!PYTHON! -m uvicorn main:app --host 0.0.0.0 --port %PORT%

pause
