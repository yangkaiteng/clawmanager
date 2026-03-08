import os
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List

import aiohttp
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import (
    Base, engine, get_db,
    Claw, Template, Workspace, Skill, Memory, AssistantConfig
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs(os.environ.get("DATA_DIR", "/app/data"), exist_ok=True)


def seed_database():
    from models import SessionLocal
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

        if db.query(Claw).count() == 0:
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
            db.add(AssistantConfig(name="Nano Claw", url=None, api_key=None, model="gpt-4"))

        db.commit()
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


app = FastAPI(title="ClawManager API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class ClawCreate(BaseModel):
    name: str
    url: str
    api_key: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = "gpt-4"


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


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    claw_id: Optional[int] = None
    description: Optional[str] = None


class SkillCreate(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str
    workspace_id: int


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None


class MemoryCreate(BaseModel):
    content: str
    claw_id: Optional[int] = None
    workspace_id: Optional[int] = None
    importance: int = 3


class AssistantConfigUpdate(BaseModel):
    url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    name: Optional[str] = None


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
    }


def memory_to_dict(m: Memory) -> dict:
    return {
        "id": m.id,
        "content": m.content,
        "claw_id": m.claw_id,
        "workspace_id": m.workspace_id,
        "importance": m.importance,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ─── Claws ────────────────────────────────────────────────────────────────────

@app.get("/api/claws")
def list_claws(db: Session = Depends(get_db)):
    return [claw_to_dict(c) for c in db.query(Claw).all()]


@app.post("/api/claws", status_code=201)
def create_claw(body: ClawCreate, db: Session = Depends(get_db)):
    claw = Claw(**body.model_dump())
    db.add(claw)
    db.commit()
    db.refresh(claw)
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
        raise HTTPException(status_code=404, detail="Workspace not found")
    s = Skill(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return skill_to_dict(s)


@app.put("/api/skills/{skill_id}")
def update_skill(skill_id: int, body: SkillUpdate, db: Session = Depends(get_db)):
    s = db.query(Skill).filter(Skill.id == skill_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
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
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(m)
    db.commit()
    return {"message": "Memory deleted"}


# ─── Assistant ────────────────────────────────────────────────────────────────

MOCK_RESPONSES = [
    "I'm Nano Claw, your AI assistant! I can help you manage your OpenClaw instances, apply templates, and monitor system health. What would you like to know?",
    "Your claw instances are looking great! I'd recommend running health checks periodically to ensure optimal performance.",
    "The Template Marketplace has some excellent prompts for your use case. The 'Code Review Assistant' template is particularly popular right now.",
    "For better memory management, try organizing your memories by importance level (1-5). High-importance memories are prioritized during inference.",
    "I notice you have some offline claw instances. Would you like me to help troubleshoot the connection issues?",
    "Workspaces are a great way to organize skills and memories for specific tasks. Consider creating dedicated workspaces for different use cases!",
]

_mock_counter = 0


@app.post("/api/assistant/chat")
async def assistant_chat(body: ChatMessage, db: Session = Depends(get_db)):
    global _mock_counter
    config = db.query(AssistantConfig).first()

    if config and config.url:
        payload = {
            "model": config.model or "gpt-4",
            "messages": (body.history or []) + [{"role": "user", "content": body.message}],
        }
        headers = {"Content-Type": "application/json"}
        if config.api_key:
            headers["Authorization"] = f"Bearer {config.api_key}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config.url.rstrip('/')}/api/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                    ssl=False,
                ) as resp:
                    result = await resp.json()
                    reply = result["choices"][0]["message"]["content"]
                    return {"reply": reply, "model": config.model, "source": "live"}
        except Exception as e:
            logger.warning(f"Assistant proxy failed: {e}")

    response = MOCK_RESPONSES[_mock_counter % len(MOCK_RESPONSES)]
    _mock_counter += 1
    return {"reply": response, "model": "nano-claw-mock", "source": "mock"}


@app.get("/api/assistant/config")
def get_assistant_config(db: Session = Depends(get_db)):
    config = db.query(AssistantConfig).first()
    if not config:
        config = AssistantConfig(name="Nano Claw")
        db.add(config)
        db.commit()
        db.refresh(config)
    return {
        "id": config.id,
        "url": config.url,
        "api_key": "***" if config.api_key else None,
        "model": config.model,
        "name": config.name,
    }


@app.put("/api/assistant/config")
def update_assistant_config(body: AssistantConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(AssistantConfig).first()
    if not config:
        config = AssistantConfig()
        db.add(config)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return {
        "id": config.id,
        "url": config.url,
        "api_key": "***" if config.api_key else None,
        "model": config.model,
        "name": config.name,
    }


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
