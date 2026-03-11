from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float,
    ForeignKey, Boolean, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////app/data/clawmanager.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Claw(Base):
    __tablename__ = "claws"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(512), nullable=False)
    api_key = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    model = Column(String(255), nullable=True, default="gpt-4")
    status = Column(String(50), default="unknown")  # online / offline / unknown
    last_health_check = Column(DateTime, nullable=True)
    total_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspaces = relationship("Workspace", back_populates="claw", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="claw", cascade="all, delete-orphan")
    config_versions = relationship("ClawConfigVersion", back_populates="claw", cascade="all, delete-orphan")
    maintenance = relationship("ClawMaintenance", back_populates="claw", uselist=False, cascade="all, delete-orphan")
    maintenance_logs = relationship("ClawMaintenanceLog", back_populates="claw", cascade="all, delete-orphan")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, default="general")
    prompt_content = Column(Text, nullable=False)
    tags = Column(String(512), nullable=True)  # comma-separated
    likes = Column(Integer, default=0)
    author = Column(String(255), nullable=True, default="Community")
    created_at = Column(DateTime, default=datetime.utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    claw = relationship("Claw", back_populates="workspaces")
    skills = relationship("Skill", back_populates="workspace", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="workspace")
    snapshots = relationship("WorkspaceSnapshot", back_populates="workspace", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    added_by_ai = Column(Boolean, default=False)

    workspace = relationship("Workspace", back_populates="skills")
    versions = relationship("SkillVersion", back_populates="skill", cascade="all, delete-orphan")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="CASCADE"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    importance = Column(Integer, default=3)  # 1-5
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    added_by_ai = Column(Boolean, default=False)

    claw = relationship("Claw", back_populates="memories")
    workspace = relationship("Workspace", back_populates="memories")


class SkillVersion(Base):
    __tablename__ = "skill_versions"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    skill = relationship("Skill", back_populates="versions")


class WorkspaceSnapshot(Base):
    __tablename__ = "workspace_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    claw_id = Column(Integer, nullable=True)
    snapshot_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="snapshots")


class ClawConfigVersion(Base):
    __tablename__ = "claw_config_versions"

    id = Column(Integer, primary_key=True, index=True)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(512), nullable=False)
    model = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    claw = relationship("Claw", back_populates="config_versions")


class AssistantConfig(Base):
    __tablename__ = "assistant_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True, default="Nano Claw")
    # References the claw appointed as the assistant; NULL = no live claw
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="SET NULL"), nullable=True)
    # When True the assistant falls back to built-in mock responses if no live
    # claw is reachable.  Set to False to require a real claw connection.
    mock_enabled = Column(Boolean, default=True, nullable=False)

    claw = relationship("Claw")


class ClawMaintenance(Base):
    """Per-claw maintenance settings: auto vs manual, schedule, last run."""

    __tablename__ = "claw_maintenance"

    id = Column(Integer, primary_key=True, index=True)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="CASCADE"), nullable=False, unique=True)
    mode = Column(String(20), default="manual")      # "auto" | "manual"
    schedule = Column(String(20), default="daily")   # "daily" | "weekly" | "monthly"
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    claw = relationship("Claw", back_populates="maintenance")


class ClawMaintenanceLog(Base):
    """Record of each maintenance run for a claw."""

    __tablename__ = "claw_maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), nullable=False)   # e.g. "skill_sync", "memory_backup"
    related_documents = Column(Text, nullable=True)  # JSON list of document names / IDs
    run_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    remark = Column(Text, nullable=True)

    claw = relationship("Claw", back_populates="maintenance_logs")
