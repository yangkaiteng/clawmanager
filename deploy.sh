#!/usr/bin/env bash
set -euo pipefail

# ClawManager - One-click Deploy Script
# Usage: ./deploy.sh [--dev] [--build-only] [--stop]

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="clawmanager"

print_banner() {
  echo ""
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║         🦀 ClawManager v1.0            ║"
  echo "  ║    OpenClaw AI Management Platform     ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo ""
}

check_deps() {
  echo "→ Checking dependencies..."
  if ! command -v docker &>/dev/null; then
    echo "✗ Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker compose version &>/dev/null 2>&1; then
    echo "✗ Docker Compose v2 is required. Please update Docker Desktop or install the docker-compose-plugin."
    exit 1
  fi
  echo "✓ Docker $(docker --version | awk '{print $3}' | tr -d ',')"
  echo "✓ Docker Compose $(docker compose version --short)"
}

stop_services() {
  echo "→ Stopping ClawManager..."
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
  echo "✓ Services stopped."
}

deploy() {
  local mode="${1:-prod}"

  print_banner
  check_deps

  echo ""
  echo "→ Building and starting ClawManager ($mode mode)..."
  echo ""

  if [ "$mode" = "dev" ]; then
    # Dev mode: run backend directly, frontend with Vite
    echo "→ Starting backend in dev mode..."
    cd backend
    pip install -r requirements.txt -q
    mkdir -p /tmp/clawmanager-data
    DATABASE_URL="sqlite:////tmp/clawmanager-data/clawmanager.db" \
      uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..

    echo "→ Starting frontend dev server..."
    cd frontend
    npm install --silent
    VITE_API_URL=http://localhost:8000 npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo "✓ ClawManager running in dev mode!"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo ""
    echo "  Press Ctrl+C to stop"

    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    wait
  else
    # Production mode via Docker Compose
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up --build -d

    echo ""
    echo "✓ ClawManager deployed successfully!"
    echo ""
    echo "  🌐 Frontend:  http://localhost:3000"
    echo "  🔧 Backend:   http://localhost:8000"
    echo "  📚 API Docs:  http://localhost:8000/docs"
    echo ""
    echo "  Useful commands:"
    echo "    View logs:    docker compose -p clawmanager logs -f"
    echo "    Stop:         ./deploy.sh --stop"
    echo "    Restart:      ./deploy.sh"
    echo ""
  fi
}

# Parse args
case "${1:-}" in
  --stop|-s)
    print_banner
    check_deps
    stop_services
    ;;
  --dev|-d)
    deploy dev
    ;;
  --build-only)
    print_banner
    check_deps
    echo "→ Building images only..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build
    echo "✓ Build complete."
    ;;
  --help|-h)
    print_banner
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  (no args)      Deploy in production mode via Docker"
    echo "  --dev          Run in development mode (no Docker required)"
    echo "  --stop         Stop all services"
    echo "  --build-only   Build Docker images without starting"
    echo "  --help         Show this help message"
    ;;
  *)
    deploy prod
    ;;
esac
