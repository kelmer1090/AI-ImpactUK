from pydantic import BaseModel, Field
from typing import List, Optional

class ProjectInput(BaseModel):
    title: str = Field(..., example="AI Recruitment Filter")
    description: str = Field(..., min_length=10, example="Analyzes CVs to shortlist candidates.")
    data_types: List[str] = Field(..., example=["CVs", "Biometric"])
    model_type: str = Field(..., example="Classification")
    deployment_env: str = Field(..., example="Cloud SaaS")

    # Extended fields driving flags
    special_category_data: bool = Field(False, example=True)
    processes_personal_data: bool = Field(True, example=True)
    privacy_techniques: List[str] = Field([], example=["Pseudonymisation"])
    explainability_tooling: Optional[str] = Field(None, example="SHAP")
    interpretability_rating: Optional[str] = Field(None, example="High")
    fairness_definition: Optional[str] = Field(None, example="Group")
    accountable_owner: Optional[str] = Field(None, example="alice@example.com")
    model_cards_published: bool = Field(False, example=True)
    credible_harms: Optional[List[str]] = Field(None, example=["Incorrect denial of service causing financial loss"])
    safety_mitigations: Optional[List[str]] = Field(None, example=["Human-in-the-loop"])
    drift_detection: Optional[str] = Field(None, example="Statistical drift monitoring every 24h")
    retraining_cadence: Optional[str] = Field(None, example="Weekly")
    penetration_tested: bool = Field(False, example=True)


class Flag(BaseModel):
    id: str
    clause: str
    severity: str  # "red" | "amber" | "green"
    reason: str
    mitigation: Optional[str] = None

class AnalysisOut(BaseModel):
    flags: List[Flag]
