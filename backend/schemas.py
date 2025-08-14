# backend/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class ProjectInput(BaseModel):
    title: str
    description: str
    data_types: List[str] = []
    model_type: Optional[str] = None
    deployment_env: Optional[str] = None
    # Privacy
    processes_personal_data: Optional[bool] = None
    special_category_data: Optional[bool] = None
    privacy_techniques: Optional[List[str]] = None
    # Explainability / Interpretability
    explainability_tooling: Optional[str] = None
    interpretability_rating: Optional[str] = None
    # Fairness / Accountability / Transparency
    fairness_definition: Optional[List[str]] = None
    accountable_owner: Optional[str] = None
    model_cards_published: Optional[bool] = None
    # Safety & Ops
    credible_harms: Optional[List[str]] = None
    safety_mitigations: Optional[List[str]] = None
    drift_detection: Optional[str] = None
    retraining_cadence: Optional[str] = None
    penetration_tested: Optional[bool] = None

class Flag(BaseModel):
    id: str
    clause: str = ""
    severity: str = "green"
    reason: str = ""
    mitigation: Optional[str] = None

class AnalysisOut(BaseModel):
    flags: List[Flag]
