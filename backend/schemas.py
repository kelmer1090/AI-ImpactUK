from pydantic import BaseModel, Field
from typing import List, Optional

class ProjectInput(BaseModel):
    title: str = Field(..., example="AI Recruitment Filter")
    description: str = Field(..., min_length=10)
    data_types: List[str] = Field(..., example=["CVs", "Biometric"])
    model_type: str = Field(..., example="Classification")
    deployment_env: str = Field(..., example="Cloud SaaS")

class Flag(BaseModel):
    id: str
    clause: str
    severity: str  # "red" | "amber" | "green"
    reason: str
    mitigation: Optional[str] = None

class AnalysisOut(BaseModel):
    flags: List[Flag]