import os
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List

import aiohttp
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from models import (
    Base, engine, get_db, SessionLocal,
    Claw, Template, Workspace, Skill, Memory, AssistantConfig,
    SkillVersion, WorkspaceSnapshot, ClawConfigVersion,
    ClawMaintenance, ClawMaintenanceLog,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs(os.environ.get("DATA_DIR", "/app/data"), exist_ok=True)


def seed_database():
    db = SessionLocal()
    try:
        if db.query(Template).count() == 0:
            templates = [
                Template(
                    name="Code Review Assistant",
                    description="Perform thorough code reviews with security analysis and best practices suggestions.",
                    category="development",
                    prompt_content=(
                        "You are an expert code reviewer. Analyze the provided code for:\n"
                        "1. Security vulnerabilities\n2. Performance issues\n"
                        "3. Best practices violations\n4. Potential bugs\n"
                        "Provide actionable, specific feedback with examples."
                    ),
                    tags="code,review,security,development",
                    likes=42,
                    author="DevOps Pro",
                ),
                Template(
                    name="Creative Writing Companion",
                    description="Unleash creativity with an AI writing partner for stories, scripts, and content.",
                    category="creative",
                    prompt_content=(
                        "You are a creative writing assistant with expertise in storytelling. "
                        "Help craft compelling narratives with rich characters and vivid settings. "
                        "Offer suggestions for plot development, dialogue, and pacing. "
                        "Adapt your style to match the user's creative vision."
                    ),
                    tags="writing,creative,stories,content",
                    likes=87,
                    author="StoryWeaver",
                ),
                Template(
                    name="Data Analysis Expert",
                    description="Transform raw data into insights with statistical analysis and visualization guidance.",
                    category="analytics",
                    prompt_content=(
                        "You are a data scientist specializing in analytical thinking. "
                        "Help interpret datasets, suggest appropriate statistical methods, "
                        "recommend visualization types, and derive meaningful business insights. "
                        "Always validate assumptions and highlight data quality issues."
                    ),
                    tags="data,analytics,statistics,visualization",
                    likes=63,
                    author="DataMind",
                ),
                Template(
                    name="Customer Support Agent",
                    description="Handle customer inquiries professionally with empathy and efficiency.",
                    category="support",
                    prompt_content=(
                        "You are a professional customer support agent. "
                        "Respond to customer inquiries with empathy, clarity, and efficiency. "
                        "De-escalate conflicts, provide accurate information, "
                        "and always aim for first-contact resolution. "
                        "Maintain a friendly, professional tone."
                    ),
                    tags="support,customer,service,helpdesk",
                    likes=35,
                    author="SupportAce",
                ),
                Template(
                    name="Research Summarizer",
                    description="Condense complex research papers and articles into clear, actionable summaries.",
                    category="research",
                    prompt_content=(
                        "You are a research synthesis expert. "
                        "Summarize complex academic papers and research articles into clear, "
                        "concise summaries. Extract key findings, methodology, and implications. "
                        "Highlight connections between different sources and identify research gaps."
                    ),
                    tags="research,summarization,academic,knowledge",
                    likes=56,
                    author="ResearchBot",
                ),
                Template(
                    name="DevOps Automation Guide",
                    description="Automate infrastructure tasks with CI/CD pipelines and container orchestration.",
                    category="development",
                    prompt_content=(
                        "You are a DevOps automation expert specializing in CI/CD, "
                        "containerization, and infrastructure as code. "
                        "Help design robust deployment pipelines, Docker configurations, "
                        "Kubernetes manifests, and monitoring setups. "
                        "Prioritize reliability, scalability, and security."
                    ),
                    tags="devops,automation,docker,kubernetes,cicd",
                    likes=71,
                    author="InfraWizard",
                ),
                Template(
                    name="Marketing Copywriter",
                    description="Create persuasive marketing copy, ad campaigns, and brand messaging.",
                    category="marketing",
                    prompt_content=(
                        "You are a marketing copywriter with expertise in brand voice and conversion. "
                        "Create compelling marketing copy, email campaigns, social media content, "
                        "and ad creative that resonates with target audiences. "
                        "Focus on benefits over features and strong calls to action."
                    ),
                    tags="marketing,copywriting,ads,brand,content",
                    likes=49,
                    author="CopyKing",
                ),
            ]
            db.add_all(templates)

        # Seed demo claws/workspaces/skills/memories only when SEED_DEMO_DATA is
        # enabled (default true for backward compatibility).  Set the environment
        # variable to "false" or "0" on a fresh deployment to start with a clean
        # database that contains no placeholder data.
        seed_demo = os.environ.get("SEED_DEMO_DATA", "true").lower() not in ("false", "0", "no")

        if seed_demo and db.query(Claw).count() == 0:
            claws = [
                Claw(
                    name="Alpha Claw",
                    url="http://openclaw-alpha:8080",
                    api_key="sk-alpha-demo-key",
                    description="Primary production AI agent for customer-facing tasks",
                    model="gpt-4-turbo",
                    status="online",
                    last_health_check=datetime.utcnow(),
                    total_tokens=142850,
                ),
                Claw(
                    name="Beta Claw",
                    url="http://openclaw-beta:8080",
                    api_key="sk-beta-demo-key",
                    description="Development and testing AI agent instance",
                    model="gpt-3.5-turbo",
                    status="offline",
                    last_health_check=datetime.utcnow(),
                    total_tokens=28430,
                ),
                Claw(
                    name="Research Claw",
                    url="http://openclaw-research:8080",
                    api_key="sk-research-demo-key",
                    description="Specialized agent for data analysis and research tasks",
                    model="gpt-4",
                    status="unknown",
                    total_tokens=0,
                ),
            ]
            db.add_all(claws)
            db.flush()

            workspaces = [
                Workspace(
                    name="Customer Support Hub",
                    claw_id=claws[0].id,
                    description="Workspace for handling customer inquiries and support tickets",
                ),
                Workspace(
                    name="Dev Sandbox",
                    claw_id=claws[1].id,
                    description="Experimental workspace for testing new prompts and workflows",
                ),
            ]
            db.add_all(workspaces)
            db.flush()

            skills = [
                Skill(
                    name="Ticket Triage",
                    description="Categorize and prioritize incoming support tickets",
                    prompt="Analyze the incoming support ticket and categorize it by urgency (critical/high/medium/low) and type (billing/technical/general). Output JSON.",
                    workspace_id=workspaces[0].id,
                ),
                Skill(
                    name="Sentiment Analysis",
                    description="Detect customer sentiment from messages",
                    prompt="Analyze customer message sentiment. Return score -1 to 1 and label (positive/neutral/negative).",
                    workspace_id=workspaces[0].id,
                ),
                Skill(
                    name="Code Generator",
                    description="Generate boilerplate code snippets",
                    prompt="Generate clean, well-commented code based on the specification. Follow best practices for the specified language.",
                    workspace_id=workspaces[1].id,
                ),
            ]
            db.add_all(skills)

            memories = [
                Memory(
                    content="Customer base primarily uses mobile devices - optimize responses for mobile UX",
                    claw_id=claws[0].id,
                    workspace_id=workspaces[0].id,
                    importance=5,
                ),
                Memory(
                    content="Preferred response format: bullet points with emoji indicators",
                    claw_id=claws[0].id,
                    importance=3,
                ),
                Memory(
                    content="Python 3.11+ syntax preferred, use type hints everywhere",
                    claw_id=claws[1].id,
                    workspace_id=workspaces[1].id,
                    importance=4,
                ),
            ]
            db.add_all(memories)

        if db.query(AssistantConfig).count() == 0:
            db.add(AssistantConfig(name="Nano Claw", claw_id=None, mock_enabled=True))

        db.commit()
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Migrate: if assistant_config has the old schema (url column), drop & recreate
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "assistant_config" in inspector.get_table_names():
            cols = [c["name"] for c in inspector.get_columns("assistant_config")]
            if "url" in cols:
                with engine.connect() as conn:
                    conn.execute(text("DROP TABLE assistant_config"))
                    conn.commit()
                logger.info("Migrated assistant_config table to claw_id schema")
    except Exception as e:
        logger.warning(f"Migration check skipped: {e}")

    # Migrate: add new columns to skills and memories if missing
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "skills" in inspector.get_table_names():
            skill_cols = [c["name"] for c in inspector.get_columns("skills")]
            with engine.connect() as conn:
                if "added_by_ai" not in skill_cols:
                    conn.execute(text("ALTER TABLE skills ADD COLUMN added_by_ai BOOLEAN DEFAULT 0"))
                    logger.info("Added added_by_ai column to skills")
                if "updated_at" not in skill_cols:
                    conn.execute(text("ALTER TABLE skills ADD COLUMN updated_at DATETIME"))
                    logger.info("Added updated_at column to skills")
                conn.commit()
        if "memories" in inspector.get_table_names():
            memory_cols = [c["name"] for c in inspector.get_columns("memories")]
            with engine.connect() as conn:
                if "added_by_ai" not in memory_cols:
                    conn.execute(text("ALTER TABLE memories ADD COLUMN added_by_ai BOOLEAN DEFAULT 0"))
                    logger.info("Added added_by_ai column to memories")
                if "updated_at" not in memory_cols:
                    conn.execute(text("ALTER TABLE memories ADD COLUMN updated_at DATETIME"))
                    logger.info("Added updated_at column to memories")
                conn.commit()
        # Migrate: add mock_enabled to assistant_config if missing
        if "assistant_config" in inspector.get_table_names():
            ac_cols = [c["name"] for c in inspector.get_columns("assistant_config")]
            if "mock_enabled" not in ac_cols:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE assistant_config ADD COLUMN mock_enabled BOOLEAN DEFAULT 1"))
                    conn.commit()
                logger.info("Added mock_enabled column to assistant_config")
    except Exception as e:
        logger.warning(f"Column migration skipped: {e}")

    Base.metadata.create_all(bind=engine)
    seed_database()

    # Start background maintenance scheduler
    scheduler_task = asyncio.create_task(_maintenance_scheduler())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="ClawManager API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Field hints for AI-friendly validation errors ────────────────────────────

_FIELD_HINTS: dict[str, str] = {
    "name": "must be a non-empty string, e.g. \"My Claw\"",
    "url": "must be a full URL including scheme and host, e.g. \"http://openclaw-host:8080\"",
    "api_key": "optional bearer token string, e.g. \"sk-abc123\"",
    "model": "optional model identifier string, e.g. \"gpt-4\" or \"gpt-4-turbo\"",
    "description": "optional plain-text description string",
    "prompt": "required non-empty string containing the skill prompt template",
    "workspace_id": "must be a valid integer ID of an existing workspace (use GET /api/workspaces to list)",
    "claw_id": "must be a valid integer ID of an existing claw (use GET /api/claws to list), or null to unassign",
    "content": "required non-empty string for the memory text",
    "importance": "integer from 1 (low) to 5 (critical), default 3",
    "template_id": "must be a valid integer ID of an existing template (use GET /api/templates to list)",
    "prompt_content": "required non-empty string containing the template prompt",
    "category": "string category label, e.g. \"general\", \"development\", \"analysis\"",
}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return AI-friendly validation errors with field hints and example values."""
    errors = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field = loc[-1] if loc else "unknown"
        msg = err.get("msg", "invalid value")
        hint = _FIELD_HINTS.get(str(field), "")
        detail_parts = [f"Field '{field}': {msg}"]
        if hint:
            detail_parts.append(f"Hint: {hint}")
        errors.append({
            "field": field,
            "error": msg,
            "hint": hint,
            "location": " → ".join(str(l) for l in loc),
        })
    summary = "; ".join(
        f"'{e['field']}' — {e['error']}" + (f" ({e['hint']})" if e['hint'] else "")
        for e in errors
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": errors,
            "summary": summary,
            "help": (
                "Fix the listed fields and retry. "
                "All IDs must reference existing records — "
                "use the corresponding GET endpoint to list valid IDs."
            ),
        },
    )

# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class ClawCreate(BaseModel):
    name: str
    url: str
    api_key: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = "gpt-4"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must be a non-empty string, e.g. \"My Claw\"")
        return v.strip()

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("url must be a non-empty string, e.g. \"http://openclaw-host:8080\"")
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError(
                "url must start with http:// or https://, e.g. \"http://openclaw-host:8080\""
            )
        return v.strip()


class ClawUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    api_key: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "general"
    prompt_content: str
    tags: Optional[str] = None
    author: Optional[str] = "Community"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    prompt_content: Optional[str] = None
    tags: Optional[str] = None


class WorkspaceCreate(BaseModel):
    name: str
    claw_id: Optional[int] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must be a non-empty string, e.g. \"Research Hub\"")
        return v.strip()


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    claw_id: Optional[int] = None
    description: Optional[str] = None


class SkillCreate(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str
    workspace_id: int

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must be a non-empty string, e.g. \"Summarize Text\"")
        return v.strip()

    @field_validator("prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("prompt must be a non-empty string containing the skill template text")
        return v


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None


class MemoryCreate(BaseModel):
    content: str
    claw_id: Optional[int] = None
    workspace_id: Optional[int] = None
    importance: int = 3

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must be a non-empty string describing the memory")
        return v.strip()

    @field_validator("importance")
    @classmethod
    def importance_range(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("importance must be an integer between 1 (low) and 5 (critical)")
        return v


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    importance: Optional[int] = None

    @field_validator("importance")
    @classmethod
    def importance_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("importance must be an integer between 1 (low) and 5 (critical)")
        return v


class AssistantMemoryCreate(BaseModel):
    content: str
    claw_id: Optional[int] = None
    workspace_id: Optional[int] = None
    importance: int = 3

    @field_validator("importance")
    @classmethod
    def importance_range(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("importance must be an integer between 1 (low) and 5 (critical)")
        return v


class AssistantSkillCreate(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str
    workspace_id: int

    @field_validator("prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("prompt must be a non-empty string containing the skill template text")
        return v


class AssistantConfigUpdate(BaseModel):
    claw_id: Optional[int] = None
    name: Optional[str] = None
    mock_enabled: Optional[bool] = None


class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []


class ApplyTemplateRequest(BaseModel):
    template_id: int


# ─── Helpers ──────────────────────────────────────────────────────────────────

def claw_to_dict(c: Claw) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "url": c.url,
        "api_key": "***" if c.api_key else None,
        "description": c.description,
        "model": c.model,
        "status": c.status,
        "last_health_check": c.last_health_check.isoformat() if c.last_health_check else None,
        "total_tokens": c.total_tokens,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def template_to_dict(t: Template) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "category": t.category,
        "prompt_content": t.prompt_content,
        "tags": t.tags.split(",") if t.tags else [],
        "likes": t.likes,
        "author": t.author,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def workspace_to_dict(w: Workspace, include_related: bool = False) -> dict:
    d = {
        "id": w.id,
        "name": w.name,
        "claw_id": w.claw_id,
        "description": w.description,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "claw_name": w.claw.name if w.claw else None,
    }
    if include_related:
        d["skills"] = [skill_to_dict(s) for s in w.skills]
        d["memories"] = [memory_to_dict(m) for m in w.memories]
    return d


def skill_to_dict(s: Skill) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "prompt": s.prompt,
        "workspace_id": s.workspace_id,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "added_by_ai": bool(s.added_by_ai),
    }


def memory_to_dict(m: Memory) -> dict:
    return {
        "id": m.id,
        "content": m.content,
        "claw_id": m.claw_id,
        "workspace_id": m.workspace_id,
        "importance": m.importance,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "added_by_ai": bool(m.added_by_ai),
    }


def skill_version_to_dict(sv: SkillVersion) -> dict:
    return {
        "id": sv.id,
        "skill_id": sv.skill_id,
        "version_number": sv.version_number,
        "name": sv.name,
        "description": sv.description,
        "prompt": sv.prompt,
        "created_at": sv.created_at.isoformat() if sv.created_at else None,
    }


def workspace_snapshot_to_dict(ws: WorkspaceSnapshot) -> dict:
    return {
        "id": ws.id,
        "workspace_id": ws.workspace_id,
        "version_number": ws.version_number,
        "name": ws.name,
        "description": ws.description,
        "claw_id": ws.claw_id,
        "snapshot_at": ws.snapshot_at.isoformat() if ws.snapshot_at else None,
    }


def claw_config_version_to_dict(cv: ClawConfigVersion) -> dict:
    return {
        "id": cv.id,
        "claw_id": cv.claw_id,
        "version_number": cv.version_number,
        "name": cv.name,
        "url": cv.url,
        "model": cv.model,
        "description": cv.description,
        "created_at": cv.created_at.isoformat() if cv.created_at else None,
    }


# ─── Claws ────────────────────────────────────────────────────────────────────

@app.get("/api/claws")
def list_claws(db: Session = Depends(get_db)):
    return [claw_to_dict(c) for c in db.query(Claw).all()]


@app.post("/api/claws", status_code=201)
async def create_claw(body: ClawCreate, db: Session = Depends(get_db)):
    claw = Claw(**body.model_dump())
    db.add(claw)
    db.commit()
    db.refresh(claw)
    # Fire-and-forget: send skill-injection + pairing prompt to the new claw.
    # Keep a reference so the task is not silently garbage-collected before completion.
    task = asyncio.create_task(_send_pairing_prompt(claw))
    task.add_done_callback(
        lambda t: logger.warning(f"Pairing prompt task raised: {t.exception()}")
        if not t.cancelled() and t.exception() else None
    )
    return claw_to_dict(claw)


@app.get("/api/claws/{claw_id}")
def get_claw(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    return claw_to_dict(claw)


@app.put("/api/claws/{claw_id}")
def update_claw(claw_id: int, body: ClawUpdate, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(claw, field, value)
    claw.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(claw)
    return claw_to_dict(claw)


@app.delete("/api/claws/{claw_id}")
def delete_claw(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    db.delete(claw)
    db.commit()
    return {"message": "Claw deleted"}


@app.post("/api/claws/{claw_id}/health-check")
async def health_check(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")

    status = "offline"
    response_time = None
    detail = "Connection failed"

    try:
        start = asyncio.get_event_loop().time()
        async with aiohttp.ClientSession() as session:
            for path in ["/health", "/", "/api/health"]:
                try:
                    async with session.get(
                        f"{claw.url.rstrip('/')}{path}",
                        timeout=aiohttp.ClientTimeout(total=5),
                        ssl=False,
                    ) as resp:
                        elapsed = asyncio.get_event_loop().time() - start
                        response_time = round(elapsed * 1000)
                        if resp.status < 500:
                            status = "online"
                            detail = f"HTTP {resp.status} in {response_time}ms"
                            break
                        else:
                            detail = f"HTTP {resp.status}"
                            break
                except Exception:
                    continue
    except Exception as e:
        detail = str(e)

    claw.status = status
    claw.last_health_check = datetime.utcnow()
    claw.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(claw)

    return {
        "claw_id": claw_id,
        "status": status,
        "response_time_ms": response_time,
        "detail": detail,
        "checked_at": claw.last_health_check.isoformat(),
    }


@app.post("/api/claws/{claw_id}/apply-template")
async def apply_template(claw_id: int, body: ApplyTemplateRequest, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")

    template = db.query(Template).filter(Template.id == body.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    payload = {
        "model": claw.model or "gpt-4",
        "messages": [
            {"role": "system", "content": template.prompt_content},
            {"role": "user", "content": "Template applied. Confirm configuration."},
        ],
    }
    headers = {"Content-Type": "application/json"}
    if claw.api_key:
        headers["Authorization"] = f"Bearer {claw.api_key}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{claw.url.rstrip('/')}/api/chat/completions",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                ssl=False,
            ) as resp:
                result = await resp.json()
                tokens_used = result.get("usage", {}).get("total_tokens", 0)
                if tokens_used:
                    claw.total_tokens = (claw.total_tokens or 0) + tokens_used
                    claw.updated_at = datetime.utcnow()
                    db.commit()
                return {"success": True, "template": template.name, "response": result}
    except Exception as e:
        return {
            "success": False,
            "template": template.name,
            "message": f"Template queued (claw unreachable: {str(e)[:100]})",
            "simulated": True,
        }


@app.get("/api/claws/{claw_id}/stats")
def claw_stats(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    memories_count = db.query(Memory).filter(Memory.claw_id == claw_id).count()
    workspaces_count = db.query(Workspace).filter(Workspace.claw_id == claw_id).count()
    return {
        "claw_id": claw_id,
        "total_tokens": claw.total_tokens,
        "memories_count": memories_count,
        "workspaces_count": workspaces_count,
        "status": claw.status,
        "last_health_check": claw.last_health_check.isoformat() if claw.last_health_check else None,
    }


@app.get("/api/claws/{claw_id}/config-versions")
def list_config_versions(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    versions = (
        db.query(ClawConfigVersion)
        .filter(ClawConfigVersion.claw_id == claw_id)
        .order_by(ClawConfigVersion.version_number.desc())
        .all()
    )
    return [claw_config_version_to_dict(v) for v in versions]


@app.post("/api/claws/{claw_id}/config-versions", status_code=201)
def save_config_version(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    last = (
        db.query(ClawConfigVersion)
        .filter(ClawConfigVersion.claw_id == claw_id)
        .order_by(ClawConfigVersion.version_number.desc())
        .first()
    )
    next_version = (last.version_number + 1) if last else 1
    cv = ClawConfigVersion(
        claw_id=claw_id,
        version_number=next_version,
        name=claw.name,
        url=claw.url,
        model=claw.model,
        description=claw.description,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return claw_config_version_to_dict(cv)


@app.post("/api/claws/{claw_id}/config-versions/{version_id}/restore")
def restore_config_version(claw_id: int, version_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    cv = db.query(ClawConfigVersion).filter(
        ClawConfigVersion.id == version_id,
        ClawConfigVersion.claw_id == claw_id,
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Config version not found")
    claw.name = cv.name
    claw.url = cv.url
    claw.model = cv.model
    claw.description = cv.description
    claw.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(claw)
    return claw_to_dict(claw)


# ─── Maintenance settings & logs ──────────────────────────────────────────────

CLAWMANAGER_BASE_URL = os.environ.get("CLAWMANAGER_BASE_URL", "http://localhost:8000")


def _maintenance_to_dict(m: ClawMaintenance) -> dict:
    return {
        "id": m.id,
        "claw_id": m.claw_id,
        "mode": m.mode,
        "schedule": m.schedule,
        "last_run_at": m.last_run_at.isoformat() if m.last_run_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def _maintenance_log_to_dict(log: ClawMaintenanceLog) -> dict:
    return {
        "id": log.id,
        "claw_id": log.claw_id,
        "category": log.category,
        "related_documents": log.related_documents,
        "run_at": log.run_at.isoformat() if log.run_at else None,
        "success": log.success,
        "remark": log.remark,
    }


def _get_or_create_maintenance(claw_id: int, db: Session) -> ClawMaintenance:
    m = db.query(ClawMaintenance).filter(ClawMaintenance.claw_id == claw_id).first()
    if not m:
        m = ClawMaintenance(claw_id=claw_id, mode="manual", schedule="daily")
        db.add(m)
        db.commit()
        db.refresh(m)
    return m


class MaintenanceSettingsUpdate(BaseModel):
    mode: Optional[str] = None      # "auto" | "manual"
    schedule: Optional[str] = None  # "daily" | "weekly" | "monthly"

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("auto", "manual"):
            raise ValueError("mode must be 'auto' or 'manual'")
        return v

    @field_validator("schedule")
    @classmethod
    def validate_schedule(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("daily", "weekly", "monthly"):
            raise ValueError("schedule must be 'daily', 'weekly', or 'monthly'")
        return v


@app.get("/api/claws/{claw_id}/maintenance")
def get_maintenance_settings(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    return _maintenance_to_dict(_get_or_create_maintenance(claw_id, db))


@app.put("/api/claws/{claw_id}/maintenance")
def update_maintenance_settings(
    claw_id: int, body: MaintenanceSettingsUpdate, db: Session = Depends(get_db)
):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    m = _get_or_create_maintenance(claw_id, db)
    if body.mode is not None:
        m.mode = body.mode
    if body.schedule is not None:
        m.schedule = body.schedule
    m.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(m)
    return _maintenance_to_dict(m)


@app.post("/api/claws/{claw_id}/maintenance/run", status_code=202)
async def run_maintenance_now(claw_id: int, db: Session = Depends(get_db)):
    """Trigger a manual maintenance run for a claw immediately."""
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    log = await _run_maintenance_for_claw(claw, db)
    return _maintenance_log_to_dict(log)


@app.get("/api/claws/{claw_id}/maintenance/logs")
def list_maintenance_logs(claw_id: int, db: Session = Depends(get_db)):
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    logs = (
        db.query(ClawMaintenanceLog)
        .filter(ClawMaintenanceLog.claw_id == claw_id)
        .order_by(ClawMaintenanceLog.run_at.desc())
        .limit(50)
        .all()
    )
    return [_maintenance_log_to_dict(log) for log in logs]


async def _send_to_claw(claw: Claw, messages: list, timeout: int = 20) -> dict:
    """Send a chat/completions request to a claw and return the parsed JSON response."""
    headers = {"Content-Type": "application/json"}
    if claw.api_key:
        headers["Authorization"] = f"Bearer {claw.api_key}"
    payload = {"model": claw.model or "gpt-4", "messages": messages}
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{claw.url.rstrip('/')}/api/chat/completions",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=timeout),
            ssl=False,
        ) as resp:
            return await resp.json()


async def _send_pairing_prompt(claw: Claw) -> None:
    """Send the pairing + skill-injection prompt to a newly added claw."""
    prompt = PAIRING_PROMPT_TEMPLATE.format(
        claw_name=claw.name,
        claw_url=claw.url,
        claw_id=claw.id,
        clawmanager_base_url=CLAWMANAGER_BASE_URL,
        skill_prompt=CLAWMANAGER_SYSTEM_PROMPT,
    )
    try:
        result = await _send_to_claw(
            claw,
            [
                {"role": "system", "content": CLAWMANAGER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            timeout=15,
        )
        tokens = result.get("usage", {}).get("total_tokens", 0)
        logger.info(
            f"Pairing prompt sent to claw '{claw.name}' "
            f"(tokens: {tokens}): "
            f"{result.get('choices', [{}])[0].get('message', {}).get('content', '')[:80]!r}"
        )
    except Exception as e:
        logger.warning(f"Could not send pairing prompt to claw '{claw.name}': {e}")


async def _run_maintenance_for_claw(claw: Claw, db: Session) -> ClawMaintenanceLog:
    """Build the maintenance prompt with live backend data and send it to the claw."""
    workspaces = db.query(Workspace).filter(Workspace.claw_id == claw.id).all()
    workspace_names = ", ".join(w.name for w in workspaces) if workspaces else "none"
    skill_count = sum(len(w.skills) for w in workspaces)
    memory_count = db.query(Memory).filter(Memory.claw_id == claw.id).count()

    prompt = MAINTENANCE_PROMPT_TEMPLATE.format(
        claw_name=claw.name,
        claw_id=claw.id,
        claw_url=claw.url,
        claw_model=claw.model or "N/A",
        workspace_count=len(workspaces),
        workspace_names=workspace_names,
        skill_count=skill_count,
        memory_count=memory_count,
        last_health_check=claw.last_health_check.isoformat() if claw.last_health_check else "never",
        run_at=datetime.utcnow().isoformat(),
        clawmanager_base_url=CLAWMANAGER_BASE_URL,
    )

    success = False
    remark = ""
    related_docs = f"workspaces: {workspace_names}"

    try:
        result = await _send_to_claw(
            claw,
            [
                {"role": "system", "content": CLAWMANAGER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            timeout=30,
        )
        reply = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        tokens = result.get("usage", {}).get("total_tokens", 0)
        success = True
        remark = reply[:500] if reply else "OK"
        if tokens:
            claw.total_tokens = (claw.total_tokens or 0) + tokens
        logger.info(f"Maintenance run complete for claw '{claw.name}' (tokens: {tokens})")
    except Exception as e:
        remark = f"Error: {str(e)[:300]}"
        logger.warning(f"Maintenance run failed for claw '{claw.name}': {e}")

    log = ClawMaintenanceLog(
        claw_id=claw.id,
        category="maintenance",
        related_documents=related_docs,
        run_at=datetime.utcnow(),
        success=success,
        remark=remark,
    )
    db.add(log)

    # Update last_run_at on the maintenance settings record
    m = _get_or_create_maintenance(claw.id, db)
    m.last_run_at = datetime.utcnow()
    m.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(log)
    return log


async def _maintenance_scheduler() -> None:
    """Background task: run auto-maintenance for claws whose schedule is due."""
    INTERVAL_SECONDS = 3600  # check every hour
    SCHEDULE_HOURS = {
        "daily": 24,
        "weekly": 168,
        "monthly": 720,  # approximation: 30 days × 24 hours
    }

    while True:
        try:
            await asyncio.sleep(INTERVAL_SECONDS)
            db = SessionLocal()
            try:
                settings = db.query(ClawMaintenance).filter(ClawMaintenance.mode == "auto").all()
                now = datetime.utcnow()
                for s in settings:
                    hours = SCHEDULE_HOURS.get(s.schedule, 24)
                    if s.last_run_at is None or (now - s.last_run_at).total_seconds() >= hours * 3600:
                        claw = db.query(Claw).filter(Claw.id == s.claw_id).first()
                        if claw:
                            logger.info(f"Auto-maintenance triggered for claw '{claw.name}'")
                            await _run_maintenance_for_claw(claw, db)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Maintenance scheduler error: {e}")


# ─── Templates ────────────────────────────────────────────────────────────────

@app.get("/api/templates")
def list_templates(category: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Template)
    if category and category != "all":
        q = q.filter(Template.category == category)
    return [template_to_dict(t) for t in q.order_by(Template.likes.desc()).all()]


@app.post("/api/templates", status_code=201)
def create_template(body: TemplateCreate, db: Session = Depends(get_db)):
    t = Template(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return template_to_dict(t)


@app.get("/api/templates/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return template_to_dict(t)


@app.put("/api/templates/{template_id}")
def update_template(template_id: int, body: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return template_to_dict(t)


@app.delete("/api/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"message": "Template deleted"}


@app.post("/api/templates/{template_id}/like")
def like_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    t.likes = (t.likes or 0) + 1
    db.commit()
    return {"likes": t.likes}


# ─── Workspaces ───────────────────────────────────────────────────────────────

@app.get("/api/workspaces")
def list_workspaces(db: Session = Depends(get_db)):
    return [workspace_to_dict(w, include_related=True) for w in db.query(Workspace).all()]


@app.post("/api/workspaces", status_code=201)
def create_workspace(body: WorkspaceCreate, db: Session = Depends(get_db)):
    w = Workspace(**body.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return workspace_to_dict(w, include_related=True)


@app.get("/api/workspaces/{workspace_id}")
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace_to_dict(w, include_related=True)


@app.put("/api/workspaces/{workspace_id}")
def update_workspace(workspace_id: int, body: WorkspaceUpdate, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(w, field, value)
    db.commit()
    db.refresh(w)
    return workspace_to_dict(w, include_related=True)


@app.delete("/api/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(w)
    db.commit()
    return {"message": "Workspace deleted"}


@app.post("/api/workspaces/{workspace_id}/snapshots", status_code=201)
def save_workspace_snapshot(workspace_id: int, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    next_version = db.query(WorkspaceSnapshot).filter(
        WorkspaceSnapshot.workspace_id == workspace_id
    ).count() + 1
    snap = WorkspaceSnapshot(
        workspace_id=workspace_id,
        version_number=next_version,
        name=w.name,
        description=w.description,
        claw_id=w.claw_id,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return workspace_snapshot_to_dict(snap)


@app.get("/api/workspaces/{workspace_id}/snapshots")
def list_workspace_snapshots(workspace_id: int, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    snaps = (
        db.query(WorkspaceSnapshot)
        .filter(WorkspaceSnapshot.workspace_id == workspace_id)
        .order_by(WorkspaceSnapshot.version_number.desc())
        .all()
    )
    return [workspace_snapshot_to_dict(s) for s in snaps]


@app.post("/api/workspaces/{workspace_id}/snapshots/{snapshot_id}/restore")
def restore_workspace_snapshot(workspace_id: int, snapshot_id: int, db: Session = Depends(get_db)):
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
    snap = db.query(WorkspaceSnapshot).filter(
        WorkspaceSnapshot.id == snapshot_id,
        WorkspaceSnapshot.workspace_id == workspace_id,
    ).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    w.name = snap.name
    w.description = snap.description
    w.claw_id = snap.claw_id
    db.commit()
    db.refresh(w)
    return workspace_to_dict(w, include_related=True)


# ─── Skills ───────────────────────────────────────────────────────────────────

@app.get("/api/skills")
def list_skills(workspace_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Skill)
    if workspace_id:
        q = q.filter(Skill.workspace_id == workspace_id)
    return [skill_to_dict(s) for s in q.all()]


@app.post("/api/skills", status_code=201)
def create_skill(body: SkillCreate, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == body.workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Workspace with id={body.workspace_id} not found. "
                "Use GET /api/workspaces to list all workspaces and find a valid workspace_id."
            ),
        )
    s = Skill(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return skill_to_dict(s)


@app.put("/api/skills/{skill_id}")
def update_skill(skill_id: int, body: SkillUpdate, db: Session = Depends(get_db)):
    s = db.query(Skill).filter(Skill.id == skill_id).first()
    if not s:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Skill with id={skill_id} not found. "
                "Use GET /api/skills to list all skills. "
                "To create a new skill use POST /api/skills with {name, prompt, workspace_id}."
            ),
        )
    # Save current state as a version before updating
    next_version = db.query(SkillVersion).filter(SkillVersion.skill_id == skill_id).count() + 1
    version = SkillVersion(
        skill_id=s.id,
        version_number=next_version,
        name=s.name,
        description=s.description,
        prompt=s.prompt,
    )
    db.add(version)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    s.updated_at = datetime.utcnow()
    # Preserve the original added_by_ai flag; user edits do not change ownership
    db.commit()
    db.refresh(s)
    return skill_to_dict(s)


@app.delete("/api/skills/{skill_id}")
def delete_skill(skill_id: int, db: Session = Depends(get_db)):
    s = db.query(Skill).filter(Skill.id == skill_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(s)
    db.commit()
    return {"message": "Skill deleted"}


@app.get("/api/skills/{skill_id}/versions")
def list_skill_versions(skill_id: int, db: Session = Depends(get_db)):
    s = db.query(Skill).filter(Skill.id == skill_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    versions = (
        db.query(SkillVersion)
        .filter(SkillVersion.skill_id == skill_id)
        .order_by(SkillVersion.version_number.desc())
        .all()
    )
    return [skill_version_to_dict(v) for v in versions]


@app.post("/api/skills/{skill_id}/versions/{version_id}/restore")
def restore_skill_version(skill_id: int, version_id: int, db: Session = Depends(get_db)):
    s = db.query(Skill).filter(Skill.id == skill_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    v = db.query(SkillVersion).filter(
        SkillVersion.id == version_id, SkillVersion.skill_id == skill_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    # Save current state as a new version first
    next_version = db.query(SkillVersion).filter(SkillVersion.skill_id == skill_id).count() + 1
    current_version = SkillVersion(
        skill_id=s.id,
        version_number=next_version,
        name=s.name,
        description=s.description,
        prompt=s.prompt,
    )
    db.add(current_version)
    # Restore from selected version
    s.name = v.name
    s.description = v.description
    s.prompt = v.prompt
    s.updated_at = datetime.utcnow()
    s.added_by_ai = False
    db.commit()
    db.refresh(s)
    return skill_to_dict(s)


# ─── Memories ─────────────────────────────────────────────────────────────────

@app.get("/api/memories")
def list_memories(
    claw_id: Optional[int] = Query(None),
    workspace_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Memory)
    if claw_id:
        q = q.filter(Memory.claw_id == claw_id)
    if workspace_id:
        q = q.filter(Memory.workspace_id == workspace_id)
    return [memory_to_dict(m) for m in q.order_by(Memory.importance.desc()).all()]


@app.post("/api/memories", status_code=201)
def create_memory(body: MemoryCreate, db: Session = Depends(get_db)):
    m = Memory(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return memory_to_dict(m)


@app.delete("/api/memories/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    m = db.query(Memory).filter(Memory.id == memory_id).first()
    if not m:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Memory with id={memory_id} not found. "
                "Use GET /api/memories to list all memories and find valid IDs."
            ),
        )
    db.delete(m)
    db.commit()
    return {"message": "Memory deleted"}


@app.put("/api/memories/{memory_id}")
def update_memory(memory_id: int, body: MemoryUpdate, db: Session = Depends(get_db)):
    m = db.query(Memory).filter(Memory.id == memory_id).first()
    if not m:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Memory with id={memory_id} not found. "
                "Use GET /api/memories to list all memories. "
                "To create a new memory use POST /api/memories with {content, importance (1-5), claw_id?, workspace_id?}."
            ),
        )
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(m, field, value)
    m.updated_at = datetime.utcnow()
    # Preserve the original added_by_ai flag; user edits do not change ownership
    db.commit()
    db.refresh(m)
    return memory_to_dict(m)


# ─── Assistant ────────────────────────────────────────────────────────────────

# Load system prompt from clawmanager-skill-prompt.md if available, else use built-in default
_SKILL_PROMPT_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "clawmanager-skill-prompt.md"),
    "/app/clawmanager-skill-prompt.md",
]
_SKILL_PROMPT_FALLBACK = (
    "You have been granted a new set of ClawManager management skills. "
    "These skills are additive — they extend your existing capabilities without replacing your current role, "
    "personality, or any skills you already have.\n\n"
    "ClawManager is a platform used to manage multiple OpenClaw AI agent instances from a single dashboard. "
    "Whenever a user's request involves managing ClawManager data (claws, workspaces, skills, memories), "
    "use the ClawManager REST API at http://localhost:8000 to fulfil the request. "
    "For everything else, continue to behave exactly as you normally would.\n\n"
    "MEMORY SAVING: You can save important facts about the user by including special markers in your reply. "
    "Use the format [SAVE_MEMORY:content:importance] where content is the memory text and importance is 1-5. "
    "Example: [SAVE_MEMORY:User prefers Python for scripting tasks:4] "
    "These markers will be automatically stripped from your displayed reply and saved as memories. "
    "Use this sparingly for genuinely useful persistent facts."
)


def _load_skill_prompt() -> str:
    for path in _SKILL_PROMPT_PATHS:
        try:
            resolved = os.path.realpath(path)
            if os.path.isfile(resolved):
                with open(resolved, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        logger.info(f"Loaded skill prompt from {resolved}")
                        return content
                    logger.warning(f"Skill prompt file is empty: {resolved}")
            else:
                logger.info(f"Skill prompt not found at: {resolved}")
        except Exception as e:
            logger.warning(f"Could not read skill prompt from {path}: {e}")
    logger.info("Using built-in default skill prompt")
    return _SKILL_PROMPT_FALLBACK


# System prompt injected when an appointed claw is used as the ClawManager assistant
CLAWMANAGER_SYSTEM_PROMPT = _load_skill_prompt()

# ── Prompt templates sent to newly added and maintained claws ──────────────────

PAIRING_PROMPT_TEMPLATE = """\
A new ClawManager connection has been established with this OpenClaw instance ("{claw_name}").

## What is ClawManager?
ClawManager is a control centre that uses this claw as its AI assistant to manage multiple
OpenClaw instances, workspaces, skills, and memories through natural language.

## Your new ClawManager skills
{skill_prompt}

## Pairing confirmation task
Now that you are connected, please:
1. Acknowledge this pairing by responding with a short confirmation.
2. Call the ClawManager API to record a memory about yourself using:
   POST {clawmanager_base_url}/api/assistant/memories
   Body: {{"content": "Claw '{claw_name}' paired with ClawManager at {claw_url}", "importance": 3, "claw_id": {claw_id}}}
3. If you have any skills, workspaces, or agent configurations you would like to register,
   use POST {clawmanager_base_url}/api/skills or POST {clawmanager_base_url}/api/workspaces.

Respond with: "Pairing confirmed for {claw_name}. ClawManager skills added."
"""

MAINTENANCE_PROMPT_TEMPLATE = """\
## ClawManager Maintenance Run — {claw_name}
Date/time: {run_at}

### Current ClawManager data for this claw
- Claw ID: {claw_id}
- URL: {claw_url}
- Model: {claw_model}
- Workspaces: {workspace_count} ({workspace_names})
- Skills: {skill_count}
- Memories: {memory_count}
- Last health check: {last_health_check}

### Maintenance tasks
Please review the above data and perform any needed updates:

1. **Verify data completeness** — if any workspace, skill, or memory is missing or stale,
   call the ClawManager API to add or update it.
2. **Backup key context** — save any important facts as memories:
   POST {clawmanager_base_url}/api/assistant/memories
   Body: {{"content": "<fact>", "importance": <1-5>, "claw_id": {claw_id}}}
3. **Update skills** — if any skill prompts need revision, call:
   PUT {clawmanager_base_url}/api/skills/<skill_id>
   Body: {{"prompt": "<updated prompt>"}}
4. **Report** — end your response with a JSON block summarising what you did:
   ```json
   {{"updated_memories": <count>, "updated_skills": <count>, "remarks": "<notes>"}}
   ```
"""

MOCK_RESPONSES = [
    "I'm Nano Claw, your AI assistant! I can help you manage your OpenClaw instances, apply templates, and monitor system health. What would you like to know?",
    "Your claw instances are looking great! I'd recommend running health checks periodically to ensure optimal performance.",
    "The Template Marketplace has some excellent prompts for your use case. The 'Code Review Assistant' template is particularly popular right now.",
    "For better memory management, try organizing your memories by importance level (1-5). High-importance memories are prioritized during inference.",
    "I notice you have some offline claw instances. Would you like me to help troubleshoot the connection issues?",
    "Workspaces are a great way to organize skills and memories for specific tasks. Consider creating dedicated workspaces for different use cases!",
]

_mock_counter = 0


def _config_response(config: AssistantConfig) -> dict:
    claw = config.claw
    return {
        "id": config.id,
        "name": config.name,
        "claw_id": config.claw_id,
        "claw_name": claw.name if claw else None,
        "claw_status": claw.status if claw else None,
        "mock_enabled": config.mock_enabled if config.mock_enabled is not None else True,
    }


@app.post("/api/assistant/chat")
async def assistant_chat(body: ChatMessage, db: Session = Depends(get_db)):
    import re
    global _mock_counter
    config = db.query(AssistantConfig).first()
    mock_enabled = config.mock_enabled if (config and config.mock_enabled is not None) else True
    appointed_claw = None
    if config and config.claw_id:
        appointed_claw = db.query(Claw).filter(Claw.id == config.claw_id).first()

    reply = None
    model_name = "nano-claw-mock"
    source = "mock"
    claw_name = None

    if appointed_claw:
        # Strip any existing system messages from history to avoid duplicates,
        # then prepend our ClawManager system prompt as the single system message.
        filtered_history = [m for m in (body.history or []) if m.get("role") != "system"]
        messages = [{"role": "system", "content": CLAWMANAGER_SYSTEM_PROMPT}]
        messages += filtered_history
        messages.append({"role": "user", "content": body.message})
        payload = {
            "model": appointed_claw.model or "gpt-4",
            "messages": messages,
        }
        headers = {"Content-Type": "application/json"}
        if appointed_claw.api_key:
            headers["Authorization"] = f"Bearer {appointed_claw.api_key}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{appointed_claw.url.rstrip('/')}/api/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                    ssl=False,
                ) as resp:
                    result = await resp.json()
                    reply = result["choices"][0]["message"]["content"]
                    model_name = appointed_claw.model
                    source = "live"
                    claw_name = appointed_claw.name
        except Exception as e:
            logger.warning(f"Assistant proxy failed for claw '{appointed_claw.name}': {e}")

    if reply is None:
        if not mock_enabled:
            # Mock mode is disabled — refuse to return fake responses.
            raise HTTPException(
                status_code=503,
                detail=(
                    "No live assistant available. "
                    "Please appoint a reachable claw in Settings, "
                    "or re-enable Mock Mode to use built-in responses."
                ),
            )
        reply = MOCK_RESPONSES[_mock_counter % len(MOCK_RESPONSES)]
        _mock_counter += 1

    # Extract and save [SAVE_MEMORY:content:importance] markers
    # Use non-greedy match so multiple markers in one reply are all captured correctly
    memory_pattern = re.compile(r'\[SAVE_MEMORY:(.+?):(\d+)\]')
    for match in memory_pattern.finditer(reply):
        mem_content = match.group(1).strip()
        mem_importance = max(1, min(5, int(match.group(2))))
        if mem_content:
            m = Memory(content=mem_content, importance=mem_importance, added_by_ai=True)
            db.add(m)
    if memory_pattern.search(reply):
        db.commit()
    reply = memory_pattern.sub('', reply).strip()

    return {"reply": reply, "model": model_name, "source": source, "claw_name": claw_name}


@app.get("/api/assistant/config")
def get_assistant_config(db: Session = Depends(get_db)):
    config = db.query(AssistantConfig).first()
    if not config:
        config = AssistantConfig(name="Nano Claw")
        db.add(config)
        db.commit()
        db.refresh(config)
    return _config_response(config)


@app.put("/api/assistant/config")
async def update_assistant_config(body: AssistantConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(AssistantConfig).first()
    if not config:
        config = AssistantConfig()
        db.add(config)
    # Explicitly allow clearing claw_id to None, but only update other fields when non-None
    data = body.model_dump()
    for field, value in data.items():
        if field == "claw_id" or value is not None:
            setattr(config, field, value)
    db.commit()
    db.refresh(config)

    # When a claw is appointed, send the skill prompt to it so it's primed as the assistant
    if config.claw_id:
        appointed_claw = db.query(Claw).filter(Claw.id == config.claw_id).first()
        if appointed_claw:
            payload = {
                "model": appointed_claw.model or "gpt-4",
                "messages": [
                    {"role": "system", "content": CLAWMANAGER_SYSTEM_PROMPT},
                    {"role": "user", "content": "You are now configured as the ClawManager AI Assistant. Please acknowledge."},
                ],
            }
            headers = {"Content-Type": "application/json"}
            if appointed_claw.api_key:
                headers["Authorization"] = f"Bearer {appointed_claw.api_key}"
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{appointed_claw.url.rstrip('/')}/api/chat/completions",
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                        ssl=False,
                    ) as resp:
                        result = await resp.json()
                        logger.info(f"Skill prompt sent to claw '{appointed_claw.name}': acknowledged")
                        tokens_used = result.get("usage", {}).get("total_tokens", 0)
                        if tokens_used:
                            appointed_claw.total_tokens = (appointed_claw.total_tokens or 0) + tokens_used
                            db.commit()
            except Exception as e:
                logger.warning(f"Could not send skill prompt to claw '{appointed_claw.name}': {e}")

    return _config_response(config)


@app.post("/api/assistant/memories", status_code=201)
def assistant_create_memory(body: AssistantMemoryCreate, db: Session = Depends(get_db)):
    m = Memory(
        content=body.content,
        claw_id=body.claw_id,
        workspace_id=body.workspace_id,
        importance=body.importance,
        added_by_ai=True,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return memory_to_dict(m)


@app.post("/api/assistant/skills", status_code=201)
def assistant_create_skill(body: AssistantSkillCreate, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == body.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    s = Skill(
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        workspace_id=body.workspace_id,
        added_by_ai=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return skill_to_dict(s)


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_claws = db.query(Claw).count()
    healthy_claws = db.query(Claw).filter(Claw.status == "online").count()
    total_templates = db.query(Template).count()
    total_workspaces = db.query(Workspace).count()
    total_skills = db.query(Skill).count()
    total_memories = db.query(Memory).count()
    total_tokens = db.query(Claw).all()
    tokens_sum = sum(c.total_tokens or 0 for c in total_tokens)

    claws = db.query(Claw).all()
    claw_health = [
        {
            "id": c.id,
            "name": c.name,
            "status": c.status,
            "total_tokens": c.total_tokens or 0,
        }
        for c in claws
    ]

    return {
        "total_claws": total_claws,
        "healthy_claws": healthy_claws,
        "total_templates": total_templates,
        "total_workspaces": total_workspaces,
        "total_skills": total_skills,
        "total_memories": total_memories,
        "total_tokens": tokens_sum,
        "claw_health": claw_health,
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "clawmanager-api"}


# ─── Optional: serve built frontend (no-Docker mode) ─────────────────────────
# When FRONTEND_DIST env var points to the frontend/dist directory, the backend
# serves the React SPA directly so only one process is needed.

_frontend_dist = os.environ.get("FRONTEND_DIST", "")
if _frontend_dist and os.path.isdir(_frontend_dist):
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        index = os.path.join(_frontend_dist, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return {"error": "Frontend not found"}
