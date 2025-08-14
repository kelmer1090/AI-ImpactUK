# backend/schemas.py
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any



# Input from the Describe Wizard / API clients
class ProjectInput(BaseModel):
    # Core
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


# Policy corpus + retrieval shapes
# (used by /clauses and /search endpoints)

class PolicyClause(BaseModel):
    id: str                          # e.g., "DSIT §3.2.3 Safety"
    label: str                       # short human label
    text: str                        # normative clause text
    link: Optional[str] = None       # public reference URL
    category: Optional[str] = None   # e.g., "Safety"
    document: Optional[str] = None   # e.g., "DSIT White Paper"
    framework: Optional[str] = None  # e.g., "DSIT" | "ICO" | "ISO"

class SearchQuery(BaseModel):
    q: str
    top_k: int = 5
    frameworks: Optional[List[str]] = None  # filter to ["DSIT","ICO","ISO"] if desired

class SearchHit(BaseModel):
    clause_id: str
    score: float
    snippet: Optional[str] = None
    clause: PolicyClause


# ────────────────────────────────────────────────
# Reasoning results (back-compat with your UI)
# ────────────────────────────────────────────────
Severity = Literal["red", "amber", "green"]

class Flag(BaseModel):
    # UI depends on: id, clause, severity, reason, mitigation
    id: str
    clause: str
    severity: Severity = "green"
    reason: str
    mitigation: Optional[str] = None

    # Extra evidence (optional, shown later or for audit)
    evidence: Optional[str] = None       # quoted sentence(s) from clause or project
    model: Optional[str] = None          # e.g., "llama3.1:8b-instruct"
    # Rich metadata if you want to expose/cite more later
    meta: Optional[Dict[str, Any]] = None  # e.g., {"label": "...", "link": "...", "framework": "DSIT"}

class AnalysisDebug(BaseModel):
    retrieved: List[SearchHit] = []      # what retrieval returned
    prompt: Optional[str] = None         # full system/user prompt sent to LLM
    raw_response: Optional[str] = None   # raw LLM text (pre-parsed)
    timings_ms: Optional[Dict[str, float]] = None  # {"retrieval": 12.3, "llm": 420.5}

class AnalysisOut(BaseModel):
    flags: List[Flag]
    debug: Optional[AnalysisDebug] = None
