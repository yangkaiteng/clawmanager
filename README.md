# 🦀 ClawManager

**OpenClaw AI Management Platform** — A beautiful, modern web application for managing multiple OpenClaw AI agent instances.

![ClawManager Dashboard](https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-06b6d4?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-10b981?style=flat-square)

## ✨ Features

- 🤖 **Claw Management** — Add, edit, delete and health-check OpenClaw AI instances
- 📚 **Template Marketplace** — Browse, create, like, and apply prompt templates to any claw
- 🗂️ **Workspaces** — Organize skills and memories per task context
- 🧠 **Nano Claw Assistant** — Floating AI chat panel powered by your configured claw (or mock)
- 📊 **Dashboard** — Real-time stats, health bars, token usage, quick actions
- 🎨 **Dark Neon UI** — Glassmorphism, neon glow effects, smooth animations

## 🚀 One-Click Deploy

```bash
git clone https://github.com/your-org/clawmanager
cd clawmanager
./deploy.sh
```

Open **http://localhost:3000** 🎉

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, SQLite, aiohttp |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| Deploy | Docker Compose |

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
├── docker-compose.yml
├── deploy.sh
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
| POST | `/api/assistant/chat` | Chat with Nano Claw |
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

Configure the Nano Claw assistant via **Settings → Nano Claw Assistant** in the UI,
or set `VITE_API_URL` in the frontend environment.

## License

MIT
