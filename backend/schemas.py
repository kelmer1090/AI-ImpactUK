# backend/schemas.py
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ProjectInput(BaseModel):
    # ---- core / narrative ----
    title: str
    description: str
    data_types: List[str] = Field(default_factory=list)
    model_type: Optional[str] = None
    deployment_env: Optional[str] = None

    # context
    sector: Optional[str] = None
    significant_decision: Optional[bool] = None
    lifecycle_stage: Optional[str] = None

    # ---- privacy ----
    processes_personal_data: Optional[bool] = None
    special_category_data: Optional[bool] = None
    privacy_techniques: Optional[List[str]] = None
    retention_defined: Optional[bool] = None
    lineage_doc_present: Optional[bool] = None

    # (new) role + DPIA risk level
    controller_role: Optional[str] = None
    risk_level: Optional[str] = None

    # ---- explainability / interpretability ----
    explainability_tooling: Optional[str] = None
    explainability_channels: Optional[List[str]] = None
    interpretability_rating: Optional[str] = None
    key_features: Optional[str] = None
    documentation_consumers: Optional[List[str]] = None

    # ---- fairness / governance ----
    fairness_definition: Optional[List[str]] = None
    fairness_stakeholders: Optional[str] = None
    accountable_owner: Optional[str] = None
    model_cards_published: Optional[bool] = None
    escalation_route: Optional[str] = None

    # ---- technical metrics / robustness ----
    metrics: Optional[str] = None
    validation_score: Optional[float] = None
    domain_threshold_met: Optional[bool] = None
    robustness_tests: Optional[str] = None
    robustness_above_baseline: Optional[bool] = None
    generative_risk_above_baseline: Optional[bool] = None

    # (new) pre-deploy & security first-class booleans
    pre_deployment_testing: Optional[bool] = None
    access_controls_defined: Optional[bool] = None
    supply_chain_review: Optional[bool] = None

    # ---- ops / security / resilience ----
    drift_detection: Optional[str] = None
    retraining_cadence: Optional[str] = None
    penetration_tested: Optional[bool] = None
    worst_vuln_fix: Optional[str] = None
    safe_mode: Optional[str] = None
    mttr_target_hours: Optional[float] = None

    credible_harms: Optional[List[str]] = None
    safety_mitigations: Optional[List[str]] = None

    # ---- sustainability ----
    sustainability_estimate: Optional[str] = None

    # ---- bias management ----
    bias_tests: Optional[str] = None
    bias_status: Optional[str] = None
    diversity_steps: Optional[str] = None
    community_reviews: Optional[bool] = None

    # (new) transparency & oversight booleans
    outputs_exposed_to_end_users: Optional[bool] = None
    output_label_includes_probabilistic: Optional[bool] = None
    human_oversight_defined: Optional[bool] = None
    automation_bias_controls_defined: Optional[bool] = None

    # (new) data quality readiness
    data_quality_checks: Optional[bool] = None


class PolicyClause(BaseModel):
    id: str
    label: str
    text: str
    link: Optional[str] = None
    category: Optional[str] = None
    document: Optional[str] = None
    framework: Optional[str] = None
    phase: Optional[str] = None  # data | model | deployment

class SearchQuery(BaseModel):
    q: str
    top_k: int = 5
    frameworks: Optional[List[str]] = None

class SearchHit(BaseModel):
    clause_id: str
    score: float
    snippet: Optional[str] = None
    clause: PolicyClause

Severity = Literal["red", "amber", "green"]

class Flag(BaseModel):
    id: str
    clause: str
    severity: Severity = "green"
    reason: str
    mitigation: Optional[str] = None
    evidence: Optional[str] = None
    model: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None  # {label, link, framework, phase}

class AnalysisDebug(BaseModel):
    retrieved: List[SearchHit] = Field(default_factory=list)
    prompt: Optional[str] = None
    raw_response: Optional[str] = None
    timings_ms: Optional[Dict[str, float]] = None

class AnalysisOut(BaseModel):
    flags: List[Flag]
    debug: Optional[AnalysisDebug] = None
    corpus_version: Optional[str] = None
