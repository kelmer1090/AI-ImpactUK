# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Any, Dict
import pathlib, yaml, logging
from schemas import ProjectInput, AnalysisOut, Flag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load rules.yaml
rules_path = pathlib.Path(__file__).with_name("rules.yaml")
try:
    loaded = yaml.safe_load(rules_path.read_text())
    RULES: List[Dict[str, Any]] = (
        loaded["rules"] if isinstance(loaded, dict) and "rules" in loaded else (loaded or [])
    )
    logger.info(f"Loaded {len(RULES)} rules.")
except Exception as e:
    logger.error(f"Failed to load rules.yaml: {e}")
    RULES = []

def _ci_equals(a: Any, b: Any) -> bool:
    return isinstance(a, str) and isinstance(b, str) and a.strip().lower() == b.strip().lower()

def evaluate_rule(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    trig = rule.get("trigger", {})
    reasons = []

    if "description_min_length" in trig:
        min_len = trig["description_min_length"]
        desc = (payload.get("description") or "")
        if len(desc) < min_len: reasons.append(f"description length {len(desc)} < {min_len}")
        else: return False

    if trig.get("title_missing"):
        title = (payload.get("title") or "")
        if title.strip() == "": reasons.append("title is missing")
        else: return False

    if "model_type" in trig:
        expected = trig["model_type"]; actual = payload.get("model_type") or ""
        matched = any(_ci_equals(e, actual) for e in expected) if isinstance(expected, list) else _ci_equals(expected, actual)
        if matched: reasons.append(f"model_type '{actual}' matches expected {expected}")
        else: return False

    if "data_types" in trig:
        expected = trig["data_types"]; actual = payload.get("data_types") or []
        if expected == []:
            if not actual: reasons.append("no data_types specified")
            else: return False
        else:
            if any(dt in actual for dt in expected): reasons.append(f"data_types {actual} intersects {expected}")
            else: return False

    if trig.get("special_category_data"):
        if payload.get("special_category_data") is True: reasons.append("special-category data processed")
        else: return False

    if trig.get("processes_personal_data"):
        if payload.get("processes_personal_data") is True: reasons.append("personal data processed")
        else: return False

    if "privacy_techniques" in trig:
        actual = payload.get("privacy_techniques") or []
        if not actual or any(_ci_equals(t, "None") for t in actual): reasons.append("privacy techniques missing or explicitly none")
        else: return False

    if trig.get("explainability_tooling_missing"):
        tooling = (payload.get("explainability_tooling") or "")
        if tooling.strip() == "": reasons.append("explainability tooling missing")
        else: return False

    if trig.get("interpretability_not_rated"):
        rating = payload.get("interpretability_rating")
        if not rating or (isinstance(rating, str) and rating.strip() == ""): reasons.append("interpretability not rated")
        else: return False

    if trig.get("fairness_definition_missing"):
        if not payload.get("fairness_definition"): reasons.append("fairness definition missing")
        else: return False

    if trig.get("accountable_owner_missing"):
        owner = (payload.get("accountable_owner") or "")
        if owner.strip() == "": reasons.append("accountable owner missing")
        else: return False

    if "model_cards_published" in trig:
        expected = trig["model_cards_published"]; actual = payload.get("model_cards_published")
        if actual is None:
            if expected is False: reasons.append("model cards not planned (absent field)")
            else: return False
        else:
            if actual == expected: reasons.append(f"model_cards_published == {actual}")
            else: return False

    if trig.get("credible_harms_listed"):
        harms = payload.get("credible_harms") or []
        if isinstance(harms, list) and len(harms) > 0: reasons.append("credible harms enumerated")
        else: return False

    if "safety_mitigations" in trig:
        if not (payload.get("safety_mitigations") or []): reasons.append("safety mitigations missing despite listed harms")
        else: return False

    if trig.get("drift_detection_missing"):
        drift = (payload.get("drift_detection") or "")
        if drift.strip() == "": reasons.append("drift detection strategy missing")
        else: return False

    if "retraining_cadence" in trig:
        expected = trig["retraining_cadence"]; actual = (payload.get("retraining_cadence") or "")
        if actual in expected: reasons.append(f"retraining_cadence '{actual}' is considered low/infrequent")
        else: return False

    if trig.get("pen_test_missing"):
        if not payload.get("penetration_tested", False): reasons.append("penetration/red-team testing missing")
        else: return False

    return bool(reasons)

@app.get("/ping")
def ping():
    return {"msg": "pong"}

@app.post("/analyse", response_model=AnalysisOut)
def analyse(payload: ProjectInput):
    flags: List[Flag] = []
    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    for rule in RULES:
        try:
            if evaluate_rule(rule, payload_dict):
                flags.append(Flag(
                    id=rule.get("id", ""),
                    clause=rule.get("clause", ""),
                    severity=rule.get("severity", "green"),
                    reason=rule.get("reason", ""),
                    mitigation=rule.get("mitigation"),
                ))
        except Exception as e:
            logger.error(f"Error evaluating rule {rule.get('id')}: {e}")
    return AnalysisOut(flags=flags)
