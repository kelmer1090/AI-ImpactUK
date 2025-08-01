from sqlmodel import SQLModel, Field
from typing import Optional
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

    # New fields (must align with what your rules/payload use)
    deployment_env: Optional[str] = None
    special_category_data: bool = False
    processes_personal_data: bool = False
    privacy_techniques: Optional[str] = None
    explainability_tooling: Optional[str] = None
    interpretability_rating: Optional[str] = None
    fairness_definition: Optional[str] = None
    accountable_owner: Optional[str] = None
    model_cards_published: bool = False
    credible_harms: Optional[str] = None
    safety_mitigations: Optional[str] = None
    drift_detection: Optional[str] = None
    retraining_cadence: Optional[str] = None
    penetration_tested: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)
