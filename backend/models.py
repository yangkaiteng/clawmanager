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


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="skills")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    claw_id = Column(Integer, ForeignKey("claws.id", ondelete="CASCADE"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    importance = Column(Integer, default=3)  # 1-5
    created_at = Column(DateTime, default=datetime.utcnow)

    claw = relationship("Claw", back_populates="memories")
    workspace = relationship("Workspace", back_populates="memories")


class AssistantConfig(Base):
    __tablename__ = "assistant_config"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(512), nullable=True)
    api_key = Column(String(512), nullable=True)
    model = Column(String(255), nullable=True, default="gpt-4")
    name = Column(String(255), nullable=True, default="Nano Claw")
