from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class Assessment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    flags: str  # JSON string of flags
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    data_types: str 
    model_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)