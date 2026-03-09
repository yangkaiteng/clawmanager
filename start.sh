#!/usr/bin/env bash
# ClawManager – One-click start (no Docker required)
# Works on Linux and macOS.  For Windows use start.bat or start.ps1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${DATA_DIR:-$SCRIPT_DIR/data}"
PORT="${PORT:-8000}"

print_banner() {
  echo ""
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║       🦞 ClawManager v1.0              ║"
  echo "  ║   OpenClaw AI Management Platform      ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo ""
}

print_banner

# ── Prerequisite checks ──────────────────────────────────────────────────────
PYTHON=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    ver=$("$cmd" -c "import sys; print(sys.version_info.major)" 2>/dev/null || echo 0)
    if [ "$ver" -ge 3 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "✗ Python 3 not found."
  echo "  Install Python 3.11+: https://www.python.org/downloads/"
  exit 1
fi
echo "✓ $($PYTHON --version)"

if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found."
  echo "  Install Node 18+: https://nodejs.org/"
  exit 1
fi
echo "✓ Node $(node --version)"

if ! command -v npm &>/dev/null; then
  echo "✗ npm not found (it ships with Node.js)."
  exit 1
fi

# ── Install Python dependencies ──────────────────────────────────────────────
echo ""
echo "→ Installing backend dependencies..."
"$PYTHON" -m pip install --upgrade -r "$SCRIPT_DIR/backend/requirements.txt" -q
echo "✓ Backend dependencies ready"

# ── Build frontend ────────────────────────────────────────────────────────────
echo ""
echo "→ Installing frontend dependencies and building..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run build
cd "$SCRIPT_DIR"
echo "✓ Frontend built"

# ── Launch ────────────────────────────────────────────────────────────────────
mkdir -p "$DATA_DIR"

echo ""
echo "  ✓ Starting ClawManager on port $PORT…"
echo ""
echo "  🌐 Open:     http://localhost:$PORT"
echo "  📚 API Docs: http://localhost:$PORT/docs"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cd "$SCRIPT_DIR/backend"
FRONTEND_DIST="$SCRIPT_DIR/frontend/dist" \
DATABASE_URL="sqlite:///$DATA_DIR/clawmanager.db" \
DATA_DIR="$DATA_DIR" \
"$PYTHON" -m uvicorn main:app --host 0.0.0.0 --port "$PORT"
