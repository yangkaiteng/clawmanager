# ClawManager

**OpenClaw AI Management Platform** — A beautiful, modern web application for managing multiple OpenClaw AI agent instances.

![ClawManager Dashboard](https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-06b6d4?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-10b981?style=flat-square)

## ✨ Features

- 🤖 **Claw Management** — Add, edit, delete and health-check OpenClaw AI instances
- 📚 **Template Marketplace** — Browse, create, like, and apply prompt templates to any claw
- 🗂️ **Workspaces** — Organize skills and memories per task context
- 🧠 **Claw AI Assistant** — Floating AI chat panel powered by your configured claw (or mock)
- 📊 **Dashboard** — Real-time stats, health bars, token usage, quick actions
- 🎨 **Dark Neon UI** — Glassmorphism, neon glow effects, smooth animations

## 🚀 Quick Start

### Without Docker (Linux / macOS / Windows)

No Docker or cloud setup needed — just Python 3.11+ and Node 18+.

**Linux / macOS:**
```bash
git clone https://github.com/your-org/clawmanager
cd clawmanager
chmod +x start.sh
./start.sh
```

**Windows (Command Prompt):**
```bat
git clone https://github.com/your-org/clawmanager
cd clawmanager
start.bat
```

**Windows / Linux / macOS (PowerShell):**
```powershell
git clone https://github.com/your-org/clawmanager
cd clawmanager
.\start.ps1          # Windows
pwsh ./start.ps1     # Linux / macOS (PowerShell 7+)
```

Open **http://localhost:8000** 🎉  
_(Both the UI and the API are served by the same process — no separate frontend server needed.)_

### With Docker

```bash
git clone https://github.com/your-org/clawmanager
cd clawmanager
./deploy.sh
```

Open **http://localhost:3000** 🎉

| Option | Command | URL |
|--------|---------|-----|
| No Docker (all platforms) | `./start.sh` / `start.bat` / `.\start.ps1` | http://localhost:8000 |
| Docker (production) | `./deploy.sh` | http://localhost:3000 |
| Docker (dev mode) | `./deploy.sh --dev` | http://localhost:3000 |

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, SQLite, aiohttp |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| Deploy | Docker Compose **or** native scripts (no Docker) |

## 📁 Project Structure

```
clawmanager/
├── backend/
│   ├── main.py          # FastAPI app & all API routes
│   ├── models.py        # SQLAlchemy models + seeding
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/         # API client + TypeScript types
│   │   ├── components/  # Layout, ClawCard, TemplateCard, NanoClawAssistant, StatusBadge
│   │   └── pages/       # Dashboard, Claws, Templates, Workspaces, Settings
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── start.sh             # One-click start – Linux / macOS (no Docker)
├── start.bat            # One-click start – Windows CMD (no Docker)
├── start.ps1            # One-click start – PowerShell cross-platform (no Docker)
├── docker-compose.yml
├── deploy.sh            # Docker-based deploy
└── README.md
```

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/claws` | List all claws |
| POST | `/api/claws` | Add a claw |
| POST | `/api/claws/{id}/health-check` | Run health check |
| POST | `/api/claws/{id}/apply-template` | Apply a template |
| GET | `/api/templates` | List templates (with category filter) |
| POST | `/api/templates/{id}/like` | Like a template |
| GET | `/api/workspaces` | List workspaces with skills & memories |
| POST | `/api/assistant/chat` | Chat with Claw AI Assistant |
| GET | `/api/stats` | Dashboard stats |

Full interactive docs at **http://localhost:8000/docs**

## 🔧 Development

```bash
# Backend
cd backend
pip install -r requirements.txt
mkdir -p data
DATABASE_URL="sqlite:///./data/clawmanager.db" DATA_DIR="./data" uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Or use the dev deploy script:
```bash
./deploy.sh --dev
```

## 📝 Configuration

Configure the Claw AI assistant via **Settings → Claw AI Assistant** in the UI,
or set `VITE_API_URL` in the frontend environment.

> **Network requirement:** The Claw AI Assistant only works when ClawManager can reach the
> appointed OpenClaw instance over the network. Run ClawManager on the **same device or cloud
> environment** as the OpenClaw instance, or make sure the claw's URL is network-accessible
> from where ClawManager is hosted. If the claw is unreachable, the assistant automatically
> falls back to Mock Mode.

## 💻 Compatibility

ClawManager runs on **Linux, macOS, and Windows** — any platform that supports Docker:

| Platform | Docker Compose | Local Dev |
|----------|---------------|-----------|
| Linux | ✅ Native | ✅ Python 3.11 + Node 18+ |
| macOS | ✅ Docker Desktop / OrbStack | ✅ Python 3.11 + Node 18+ |
| Windows | ✅ Docker Desktop (WSL 2 backend) | ✅ Python 3.11 + Node 18+ (WSL or native) |

For local dev without Docker on Windows, run the backend inside WSL 2 or use Git Bash / PowerShell —
all Python and Node commands are cross-platform.

## License

MIT
