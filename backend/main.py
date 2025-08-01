from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Any, Dict
import pathlib
import yaml
import json
import logging

from db import engine, create_db_and_tables
from models import Project, Assessment
from schemas import ProjectInput, AnalysisOut, Flag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ── CORS ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET", "DELETE", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

# ── Ensure DB tables exist ──────────────────────────
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    logger.info("Application startup complete.")

# ── Load rules.yaml (robust) ────────────────────────
rules_path = pathlib.Path(__file__).with_name("rules.yaml")
if not rules_path.exists():
    logger.warning("rules.yaml not found; continuing with empty RULES.")
    RULES: List[Dict[str, Any]] = []
else:
    try:
        loaded = yaml.safe_load(rules_path.read_text())
        RULES = loaded["rules"] if isinstance(loaded, dict) and "rules" in loaded else loaded or []
        logger.info(f"Loaded {len(RULES)} rules.")
    except Exception as e:
        logger.error(f"Failed to load rules.yaml: {e}")
        RULES = []

def _ci_equals(a: Any, b: Any) -> bool:
    if not (isinstance(a, str) and isinstance(b, str)):
        return False
    return a.strip().lower() == b.strip().lower()

def evaluate_rule(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    trig = rule.get("trigger", {})
    reasons = []

    # description_min_length
    if "description_min_length" in trig:
        min_len = trig["description_min_length"]
        desc = (payload.get("description") or "") or ""
        if len(desc) < min_len:
            reasons.append(f"description length {len(desc)} < {min_len}")
        else:
            return False

    # title_missing
    if trig.get("title_missing"):
        title = (payload.get("title") or "") or ""
        if title.strip() == "":
            reasons.append("title is missing")
        else:
            return False

    # model_type inclusion
    if "model_type" in trig:
        expected = trig["model_type"]
        actual = payload.get("model_type") or ""
        matched = False
        if isinstance(expected, list):
            for e in expected:
                if _ci_equals(e, actual):
                    matched = True
                    break
        elif isinstance(expected, str):
            matched = _ci_equals(expected, actual)
        if matched:
            reasons.append(f"model_type '{actual}' matches expected {expected}")
        else:
            return False

    # data_types logic
    if "data_types" in trig:
        expected_data_types = trig["data_types"]
        actual_data_types = payload.get("data_types") or []
        if isinstance(expected_data_types, list):
            if expected_data_types == []:
                if not actual_data_types:
                    reasons.append("no data_types specified")
                else:
                    return False
            else:
                if any(dt in actual_data_types for dt in expected_data_types):
                    reasons.append(f"data_types {actual_data_types} intersects {expected_data_types}")
                else:
                    return False

    # special_category_data
    if trig.get("special_category_data"):
        if payload.get("special_category_data") is True:
            reasons.append("special-category data processed")
        else:
            return False

    # processes_personal_data
    if trig.get("processes_personal_data"):
        if payload.get("processes_personal_data") is True:
            reasons.append("personal data processed")
        else:
            return False

    # privacy_techniques missing / "None"
    if "privacy_techniques" in trig:
        actual = payload.get("privacy_techniques") or []
        if not actual or any(_ci_equals(t, "None") for t in actual):
            reasons.append("privacy techniques missing or explicitly none")
        else:
            return False

    # explainability_tooling_missing
    if trig.get("explainability_tooling_missing"):
        tooling = (payload.get("explainability_tooling") or "") or ""
        if tooling.strip() == "":
            reasons.append("explainability tooling missing")
        else:
            return False

    # interpretability_not_rated
    if trig.get("interpretability_not_rated"):
        rating = payload.get("interpretability_rating")
        if not rating or (isinstance(rating, str) and rating.strip() == ""):
            reasons.append("interpretability not rated")
        else:
            return False

    # fairness_definition_missing
    if trig.get("fairness_definition_missing"):
        fair_def = payload.get("fairness_definition")
        if not fair_def:
            reasons.append("fairness definition missing")
        else:
            return False

    # accountable_owner_missing
    if trig.get("accountable_owner_missing"):
        owner = (payload.get("accountable_owner") or "") or ""
        if owner.strip() == "":
            reasons.append("accountable owner missing")
        else:
            return False

    # model_cards_published expected boolean
    if "model_cards_published" in trig:
        expected_bool = trig["model_cards_published"]
        actual = payload.get("model_cards_published")
        if actual is None:
            if expected_bool is False:
                reasons.append("model cards not planned (absent field)")
            else:
                return False
        else:
            if actual == expected_bool:
                reasons.append(f"model_cards_published == {actual}")
            else:
                return False

    # credible_harms_listed
    if trig.get("credible_harms_listed"):
        harms = payload.get("credible_harms") or []
        if isinstance(harms, list) and len(harms) > 0:
            reasons.append("credible harms enumerated")
        else:
            return False

    # safety_mitigations missing despite harms
    if "safety_mitigations" in trig:
        mitigations = payload.get("safety_mitigations") or []
        if not mitigations:
            reasons.append("safety mitigations missing despite listed harms")
        else:
            return False

    # drift_detection_missing
    if trig.get("drift_detection_missing"):
        drift = (payload.get("drift_detection") or "") or ""
        if drift.strip() == "":
            reasons.append("drift detection strategy missing")
        else:
            return False

    # retraining_cadence (low/infrequent)
    if "retraining_cadence" in trig:
        expected_list = trig["retraining_cadence"]
        actual = (payload.get("retraining_cadence") or "") or ""
        if actual in expected_list:
            reasons.append(f"retraining_cadence '{actual}' is considered low/infrequent")
        else:
            return False

    # pen_test_missing: expect penetration_tested False
    if trig.get("pen_test_missing"):
        if not payload.get("penetration_tested", False):
            reasons.append("penetration/red-team testing missing")
        else:
            return False

    if reasons:
        logger.debug(f"Rule '{rule.get('id')}' matched: {reasons}")
        return True

    return False


@app.get("/ping")
def ping():
    return {"msg": "pong"}


@app.post("/analyse", response_model=AnalysisOut)
def analyse(payload: ProjectInput):
    flags: List[Flag] = []
    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)

    for rule in RULES:
        try:
            if evaluate_rule(rule, payload_dict):
                flags.append(
                    Flag(
                        id=rule["id"],
                        clause=rule.get("clause", ""),
                        severity=rule.get("severity", "green"),
                        reason=rule.get("reason", ""),
                        mitigation=rule.get("mitigation"),
                    )
                )
        except Exception as e:
            logger.error(f"Error evaluating rule {rule.get('id')}: {e}")

    with Session(engine) as session:
        project = Project(
            title=payload.title,
            description=payload.description,
            data_types=json.dumps(payload.data_types),
            model_type=payload.model_type,
            # If your Project model has extra fields, add them; otherwise keep generic:
            extra=json.dumps({
                "deployment_env": payload.deployment_env,
                "special_category_data": payload.special_category_data,
                "processes_personal_data": payload.processes_personal_data,
                "privacy_techniques": payload.privacy_techniques,
                "explainability_tooling": payload.explainability_tooling,
                "interpretability_rating": payload.interpretability_rating,
                "fairness_definition": payload.fairness_definition,
                "accountable_owner": payload.accountable_owner,
                "model_cards_published": payload.model_cards_published,
                "credible_harms": payload.credible_harms,
                "safety_mitigations": payload.safety_mitigations,
                "drift_detection": payload.drift_detection,
                "retraining_cadence": payload.retraining_cadence,
                "penetration_tested": payload.penetration_tested,
            }),
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        assessment = Assessment(
            flags=json.dumps([f.dict() for f in flags]),
            project_id=project.id,
        )
        session.add(assessment)
        session.commit()

    return AnalysisOut(flags=flags)


# ── List all projects ───────────────────────────────
@app.get("/projects/", response_model=List[Project])
def get_projects():
    with Session(engine) as session:
        projects = session.exec(select(Project)).all()
        return projects


# ── Get single project ──────────────────────────────
@app.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: int):
    with Session(engine) as session:
        project = session.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project


# ── List all assessments ────────────────────────────
@app.get("/assessments/", response_model=List[Assessment])
def get_assessments():
    with Session(engine) as session:
        assessments = session.exec(select(Assessment)).all()
        for a in assessments:
            if isinstance(a.flags, str):
                try:
                    a.flags = json.loads(a.flags)
                except Exception:
                    a.flags = []
        return assessments


# ── List assessments for a project ──────────────────
@app.get("/projects/{project_id}/assessments/", response_model=List[Assessment])
def get_assessments_for_project(project_id: int):
    with Session(engine) as session:
        statement = select(Assessment).where(Assessment.project_id == project_id)
        assessments = session.exec(statement).all()
        for a in assessments:
            if isinstance(a.flags, str):
                try:
                    a.flags = json.loads(a.flags)
                except Exception:
                    a.flags = []
        return assessments


# ── Delete a project (and its assessments) ──────────
@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    with Session(engine) as session:
        project = session.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        assessments = session.exec(select(Assessment).where(Assessment.project_id == project_id)).all()
        for a in assessments:
            session.delete(a)
        session.delete(project)
        session.commit()
        return {"ok": True}


# ── Delete an assessment ────────────────────────────
@app.delete("/assessments/{assessment_id}")
def delete_assessment(assessment_id: int):
    with Session(engine) as session:
        assessment = session.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        session.delete(assessment)
        session.commit()
        return {"ok": True}
