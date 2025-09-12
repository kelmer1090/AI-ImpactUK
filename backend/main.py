# backend/main.py
from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import pathlib
import time
import re
import math
from datetime import datetime
from typing import Any, Dict, List, Optional
from difflib import SequenceMatcher
from fastapi import Request

import yaml
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from schemas import (
    ProjectInput,
    AnalysisOut,
    Flag,
    PolicyClause,
    SearchQuery,
    SearchHit,
    AnalysisDebug,
)
from llm import generate_flags, default_schema_hint  # JSON-mode LLM client

# ────────────────────────────────────────────────────────────────────────────────
# App & CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="AI-Impact UK API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allow disabling LLM for A/B or offline runs
USE_LLM = os.getenv("USE_LLM", "true").lower() == "true"

# ────────────────────────────────────────────────────────────────────────────────
# Load rules.yaml (legacy heuristic flags; optional – kept for continuity)

rules_path = pathlib.Path(__file__).with_name("rules.yaml")
try:
    _loaded = yaml.safe_load(rules_path.read_text(encoding="utf-8"))
    RULES: List[Dict[str, Any]] = (
        _loaded["rules"] if isinstance(_loaded, dict) and "rules" in _loaded else (_loaded or [])
    )
    logger.info(f"Loaded {len(RULES)} legacy rules.")
except Exception as e:
    logger.warning(f"rules.yaml not loaded ({e}); proceeding without legacy rules.")
    RULES = []


def _ci_equals(a: Any, b: Any) -> bool:
    return isinstance(a, str) and isinstance(b, str) and a.strip().lower() == b.strip().lower()


def _coerce_severity(val: Any) -> str:
    v = (str(val or "green")).strip().lower()
    return "red" if v.startswith("r") else "amber" if v.startswith("a") else "green"


def evaluate_rule(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """
    Evaluate a rule's trigger block against the payload.

    IMPORTANT: Booleans are STRICT — rules only fire on explicit True/False,
    not on missing/empty values.
    """
    trig = rule.get("trigger", {}) or {}
    reasons = []

    # ---------- explicit checks ----------
    if "description_min_length" in trig:
        min_len = trig["description_min_length"]
        desc = (payload.get("description") or "")
        if len(desc) < min_len:
            reasons.append(f"description length {len(desc)} < {min_len}")
        else:
            return False

    if trig.get("title_missing"):
        title = (payload.get("title") or "")
        if title.strip() == "":
            reasons.append("title is missing")
        else:
            return False

    if "model_type" in trig:
        expected = trig["model_type"]
        actual = payload.get("model_type") or ""
        matched = (
            any(_ci_equals(e, actual) for e in expected)
            if isinstance(expected, list)
            else _ci_equals(expected, actual)
        )
        if matched:
            reasons.append(f"model_type '{actual}' matches expected {expected}")
        else:
            return False

    if "data_types" in trig:
        expected = trig["data_types"]
        actual = payload.get("data_types") or []
        if expected == []:
            if not actual:
                reasons.append("no data_types specified")
            else:
                return False
        else:
            if any(dt in actual for dt in expected):
                reasons.append(f"data_types {actual} intersects {expected}")
            else:
                return False

    if trig.get("special_category_data"):
        if payload.get("special_category_data") is True:
            reasons.append("special-category data processed")
        else:
            return False

    if trig.get("processes_personal_data"):
        if payload.get("processes_personal_data") is True:
            reasons.append("personal data processed")
        else:
            return False

    if "privacy_techniques" in trig:
        actual = payload.get("privacy_techniques") or []
        if not actual or any(_ci_equals(t, "None") for t in actual):
            reasons.append("privacy techniques missing or explicitly none")
        else:
            return False

    if trig.get("explainability_tooling_missing"):
        tooling = (payload.get("explainability_tooling") or "")
        if tooling.strip() == "":
            reasons.append("explainability tooling missing")
        else:
            return False

    if trig.get("interpretability_not_rated"):
        rating = payload.get("interpretability_rating")
        if rating in (None, "") or (isinstance(rating, str) and rating.strip() == ""):
            reasons.append("interpretability not rated")
        else:
            return False

    if trig.get("fairness_definition_missing"):
        if not payload.get("fairness_definition"):
            reasons.append("fairness definition missing")
        else:
            return False

    if trig.get("accountable_owner_missing"):
        owner = (payload.get("accountable_owner") or "")
        if owner.strip() == "":
            reasons.append("accountable owner missing")
        else:
            return False

    if "model_cards_published" in trig:
        expected = trig["model_cards_published"]
        actual = payload.get("model_cards_published")
        if isinstance(actual, bool) and actual is expected:
            reasons.append(f"model_cards_published == {actual}")
        else:
            return False

    if trig.get("credible_harms_listed"):
        harms = payload.get("credible_harms") or []
        if isinstance(harms, list) and len(harms) > 0:
            reasons.append("credible harms enumerated")
        else:
            return False

    if "safety_mitigations" in trig:
        if not (payload.get("safety_mitigations") or []):
            reasons.append("safety mitigations missing despite listed harms")
        else:
            return False

    if trig.get("drift_detection_missing"):
        drift = (payload.get("drift_detection") or "")
        if drift.strip() == "":
            reasons.append("drift detection strategy missing")
        else:
            return False

    if "retraining_cadence" in trig:
        expected = trig["retraining_cadence"]
        actual = (payload.get("retraining_cadence") or "")
        if actual in expected:
            reasons.append(f"retraining_cadence '{actual}' is considered low/infrequent")
        else:
            return False

    if trig.get("pen_test_missing"):
        if payload.get("penetration_tested") is False:
            reasons.append("penetration/red-team testing missing")
        else:
            return False

    # First-class booleans that should only fire when explicitly False/True
    if trig.get("domain_threshold_not_met"):
        if payload.get("domain_threshold_met") is False:
            reasons.append("domain threshold not met")
        else:
            return False

    if trig.get("robustness_below_baseline"):
        if payload.get("robustness_above_baseline") is False:
            reasons.append("robustness below baseline")
        else:
            return False

    if trig.get("genai_risk_above_baseline"):
        if payload.get("generative_risk_above_baseline") is True:
            reasons.append("generative AI risk above baseline")
        else:
            return False

    if trig.get("retention_not_defined"):
        if payload.get("retention_defined") is False:
            reasons.append("data retention not defined")
        else:
            return False

    if trig.get("sustainability_estimate_missing"):
        se = payload.get("sustainability_estimate") or ""
        if str(se).strip() == "":
            reasons.append("sustainability estimate missing")
        else:
            return False

    if trig.get("explainability_channels_missing"):
        ch = payload.get("explainability_channels") or []
        if isinstance(ch, list):
            has = [c for c in ch if str(c).strip().lower() not in ("none", "")]
            if not has:
                reasons.append("no explainability surface for stakeholders")
            else:
                return False
        else:
            return False

    if "documentation_consumers_includes" in trig:
        expected = [str(x).strip().lower() for x in trig["documentation_consumers_includes"]]
        got = [str(x).strip().lower() for x in (payload.get("documentation_consumers") or [])]
        if not any(x in got for x in expected):
            reasons.append(f"documentation not planned for {expected}")
        else:
            return False

    if trig.get("community_reviews_missing_for_personal_data"):
        if payload.get("processes_personal_data") is True and payload.get("community_reviews") is False:
            reasons.append("no community/affected-group reviews despite personal data")
        else:
            return False

    # ---------- generic matcher ----------
    handled_keys = {
        "description_min_length","title_missing","model_type","data_types",
        "special_category_data","processes_personal_data","privacy_techniques",
        "explainability_tooling_missing","interpretability_not_rated",
        "fairness_definition_missing","accountable_owner_missing",
        "model_cards_published","credible_harms_listed","safety_mitigations",
        "drift_detection_missing","retraining_cadence","pen_test_missing",
        "domain_threshold_not_met","robustness_below_baseline",
        "genai_risk_above_baseline","retention_not_defined",
        "sustainability_estimate_missing","explainability_channels_missing",
        "documentation_consumers_includes","community_reviews_missing_for_personal_data",
    }

    def _empty(x):
        return x is None or (isinstance(x, str) and x.strip()=="") or (isinstance(x, (list,tuple,set,dict)) and len(x)==0)

    for k, expected in trig.items():
        if k in handled_keys:
            continue

        actual = payload.get(k, None)

        if isinstance(expected, list) and len(expected) == 0:
            if _empty(actual):
                reasons.append(f"{k} empty as required")
            else:
                return False
            continue

        if isinstance(expected, list) and len(expected) > 0:
            if isinstance(actual, (list, tuple, set)):
                a_set = {str(x).strip().lower() for x in actual}
                e_set = {str(x).strip().lower() for x in expected}
                if a_set & e_set:
                    reasons.append(f"{k} intersects expected values")
                else:
                    return False
            else:
                if any(_ci_equals(actual, e) for e in expected):
                    reasons.append(f"{k} == one of expected values")
                else:
                    return False
            continue

        if isinstance(expected, bool):
            if isinstance(actual, bool) and (actual is expected):
                reasons.append(f"{k} == {expected}")
            else:
                return False
            continue

        if isinstance(expected, (str, int, float)):
            if isinstance(expected, str) and isinstance(actual, str):
                if _ci_equals(actual, expected):
                    reasons.append(f"{k} matches '{expected}'")
                else:
                    return False
            else:
                if actual == expected:
                    reasons.append(f"{k} == {expected}")
                else:
                    return False
            continue

    return bool(reasons)

# ────────────────────────────────────────────────────────────────────────────────
# Policy corpus + Retrieval (TF-IDF)

POLICY: List[PolicyClause] = []
POLICY_VERSION: str = ""  # computed hash of the loaded corpus
_vectorizer: Optional[TfidfVectorizer] = None
_matrix = None  # sparse


def _infer_phase(c: PolicyClause) -> str:
    cat = (c.category or "").lower()
    lab = (c.label or "").lower()
    txt = f"{cat} {lab} {(c.text or '').lower()}"

    data_kw = ["data","privacy","personal","retention","consent","provenance","access control","collection","minimisation"]
    model_kw = ["fairness","bias","explain","interpret","transparen","accuracy","robust","testing","validation","documentation","model card"]
    deploy_kw = ["monitor","incident","security","ops","operation","post","drift","change","audit","retraining","deployment"]

    def has_any(words): return any(w in txt for w in words)
    if has_any(data_kw): return "data"
    if has_any(model_kw): return "model"
    if has_any(deploy_kw): return "deployment"
    fw = (c.framework or "").upper()
    if fw == "ICO": return "data"
    if fw == "DSIT": return "model"
    return "deployment"


def load_policy_corpus() -> None:
    global POLICY, POLICY_VERSION, _vectorizer, _matrix

    corpus_path = pathlib.Path(__file__).with_name("policy_corpus.json")
    if not corpus_path.exists():
        logger.warning("policy_corpus.json not found. Retrieval will be empty.")
        POLICY, POLICY_VERSION = [], ""
        _vectorizer, _matrix = None, None
        return

    raw = corpus_path.read_text(encoding="utf-8").strip()
    if not raw:
        logger.warning("policy_corpus.json is empty. Retrieval disabled.")
        POLICY, POLICY_VERSION = [], ""
        _vectorizer, _matrix = None, None
        return

    try:
        rows = json.loads(raw)
        if not isinstance(rows, list) or not rows:
            logger.warning("policy_corpus.json parsed but has no rows. Retrieval disabled.")
            POLICY, POLICY_VERSION = [], ""
            _vectorizer, _matrix = None, None
            return
    except Exception as e:
        logger.warning(f"Failed to parse policy_corpus.json: {e}. Retrieval disabled.")
        POLICY, POLICY_VERSION = [], ""
        _vectorizer, _matrix = None, None
        return

    POLICY = [PolicyClause(**row) for row in rows]
    for i, p in enumerate(POLICY):
        if getattr(p, "phase", None) in (None, ""):
            POLICY[i].phase = _infer_phase(p)

    POLICY_VERSION = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]

    texts = [f"{p.label}. {p.text}" for p in POLICY]
    _vectorizer = TfidfVectorizer(stop_words="english")
    _matrix = _vectorizer.fit_transform(texts)

    logger.info(f"Loaded policy corpus: {len(POLICY)} clauses (ver {POLICY_VERSION}).")

load_policy_corpus()


def retrieve(q: str, top_k: int = 20, frameworks: Optional[List[str]] = None) -> List[SearchHit]:
    if not POLICY or _vectorizer is None or _matrix is None:
        return []

    vec = _vectorizer.transform([q])
    sims = cosine_similarity(vec, _matrix)[0]

    fw_allow = {f.upper() for f in frameworks} if frameworks else None
    rows: List[tuple[int, float]] = []
    for idx, score in enumerate(sims):
        fw = (POLICY[idx].framework or "").upper()
        if fw_allow and fw not in fw_allow:
            continue
        rows.append((idx, float(score)))

    rows.sort(key=lambda t: t[1], reverse=True)

    buckets: Dict[str, List[SearchHit]] = {}
    for idx, score in rows:
        c = POLICY[idx]
        fw = (c.framework or "UNK").upper()
        if fw_allow and fw not in fw_allow:
            continue
        snippet = (c.text[:180] + "…") if len(c.text) > 180 else c.text
        buckets.setdefault(fw, []).append(
            SearchHit(clause_id=c.id, score=score, snippet=snippet, clause=c)
        )

    fws = sorted(buckets.keys())
    if not fws:
        return []

    per_fw = max(1, top_k // max(1, len(fws)))
    capped = {fw: hits[:per_fw] for fw, hits in buckets.items()}

    out: List[SearchHit] = []
    iters = {fw: list(hs) for fw, hs in capped.items()}
    while len(out) < top_k and any(iters.values()):
        for fw in fws:
            if iters[fw]:
                out.append(iters[fw].pop(0))
                if len(out) >= top_k:
                    break

    if len(out) < top_k:
        remaining: List[SearchHit] = []
        for fw in fws:
            remaining.extend(buckets[fw][len(capped.get(fw, [])):])
        remaining.sort(key=lambda h: h.score, reverse=True)
        out.extend(remaining[: (top_k - len(out))])

    return out[:top_k]

# ────────────────────────────────────────────────────────────────────────────────
# Prompt builders (system + user)

SEVERITY_GUIDANCE = """
Calibrate consistently:
- "red" = legal/critical gap or high residual risk
- "amber" = material risk that needs mitigation
- "green" = aligned or low residual risk
When possible, include a short evidence snippet (quote) from the clause or project facts.
Return ONLY valid JSON that matches the provided schema.
""".strip()


def build_system() -> str:
    return (
        "You are an AI governance assessor. Convert UK policy clauses (DSIT, ICO, ISO/IEC 42001) "
        "into actionable checks with conservative judgements. Output strict JSON only.\n\n"
        + SEVERITY_GUIDANCE
    )


def build_user(payload: ProjectInput, hits: List[SearchHit]) -> str:
    def join_list(val) -> str:
        try:
            if val is None:
                return ""
            if isinstance(val, (list, tuple, set)):
                return ", ".join([str(x) for x in val if x is not None])
            if isinstance(val, str):
                parts = [s.strip() for s in re.split(r"[,;\n]", val) if s.strip()]
                return ", ".join(parts)
            return str(val)
        except Exception:
            return ""

    desc = (getattr(payload, "description", "") or "").strip()
    title = (getattr(payload, "title", "") or "").strip()

    model_type = getattr(payload, "model_type", None)
    deployment_env = getattr(payload, "deployment_env", None)
    data_types = getattr(payload, "data_types", []) or []

    processes_personal_data = getattr(payload, "processes_personal_data", None)
    special_category_data  = getattr(payload, "special_category_data", None)
    explainability_tooling = getattr(payload, "explainability_tooling", None)
    interpretability_rating = getattr(payload, "interpretability_rating", None)

    fairness_definition    = getattr(payload, "fairness_definition", []) or []
    accountable_owner      = getattr(payload, "accountable_owner", None)
    model_cards_published  = getattr(payload, "model_cards_published", None)

    credible_harms         = getattr(payload, "credible_harms", []) or []
    safety_mitigations     = getattr(payload, "safety_mitigations", []) or []
    drift_detection        = getattr(payload, "drift_detection", None)
    retraining_cadence     = getattr(payload, "retraining_cadence", None)
    penetration_tested     = getattr(payload, "penetration_tested", None)

    lines, id_list = [], []
    for h in hits:
        c = h.clause
        id_list.append(c.id)
        lines.append(
            f"- id: {c.id}\n  label: {c.label}\n  framework: {c.framework}\n  text: {c.text}"
        )
    clauses_block = "\n".join(lines)

    return f"""Project:
- title: {title}
- description: {desc}
- model_type: {model_type}
- deployment_env: {deployment_env}
- data_types: {join_list(data_types)}
- privacy: processes_personal_data={processes_personal_data}, special_category_data={special_category_data}
- explainability_tooling: {explainability_tooling}
- interpretability_rating: {interpretability_rating}
- fairness_definition: {join_list(fairness_definition)}
- accountable_owner: {accountable_owner}
- model_cards_published: {model_cards_published}
- safety: harms={join_list(credible_harms)}, mitigations={join_list(safety_mitigations)}, drift_detection={drift_detection}, retraining_cadence={retraining_cadence}, penetration_tested={penetration_tested}

Candidate policy clauses (DSIT, ICO, ISO):
{clauses_block}

VALID_CLAUSE_IDS = {json.dumps(id_list)}

TASK:
1) Use only the clauses above to evaluate the project.
2) The "clause" field for EACH flag MUST be one of VALID_CLAUSE_IDS (do not invent new IDs).
3) Produce ONLY this JSON object:
   {{
     "flags": [
       {{
         "id": "<clause id>",
         "clause": "<clause id (must be in VALID_CLAUSE_IDS)>",
         "severity": "red" | "amber" | "green",
         "reason": "<one-sentence 'because' explanation referencing project facts>",
         "mitigation": "<concrete step or null>",
         "evidence": "<short quote/snippet or null>"
       }}
     ]
   }}
4) Be conservative: choose "green" only when clearly compliant; use "amber" for partial/uncertain; "red" for clear gaps.
5) Return just the JSON object; no extra text.
"""

# ─────────────────────────────────────────────
def _has_real_number(v: Any) -> bool:
    try:
        if v is None: return False
        f = float(v)
        return not math.isnan(f)
    except Exception:
        return False

def _synthesise_green_flags(payload: ProjectInput, hits: List[SearchHit]) -> List[Flag]:
    """If no issues were found, emit a few GREEN checks so the UI can show 'green %'."""
    def has_clause(cid: str) -> bool:
        cl = cid.strip().lower()
        return any((h.clause.id or "").strip().lower() == cl for h in hits)

    ps: Dict[str, Any] = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    greens: List[Flag] = []

    # 1) Data governance in place
    if ps.get("retention_defined") and ps.get("lineage_doc_present") and (ps.get("privacy_techniques") or []):
        cid = "ISO 42001 §8.2 Data-Management"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Data governance present because retention is defined, lineage documented and privacy techniques are applied.",
                mitigation=None, evidence="retention_defined=True; lineage_doc_present=True; privacy_techniques set"
            ))

    # 2) Transparency & explainability present
    if ps.get("explainability_tooling") and (ps.get("explainability_channels") or []):
        cid = "DSIT §3.2.3 Transparency"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Transparent/explainable because explainability tooling and channels for users are defined.",
                mitigation=None, evidence=str(ps.get("explainability_tooling"))
            ))

    # 3) Interpretability adequate
    ir = ps.get("interpretability_rating")
    try:
        ir_ok = (float(ir) >= 3)
    except Exception:
        ir_ok = str(ir).strip() in {"3","4","5","high"}
    if ir_ok and ps.get("explainability_tooling"):
        cid = "ISO 42001 AnnexA A.6.8 Explainability"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Interpretability is adequate for the context because interpretability is rated ≥3 and tooling is in place.",
                mitigation=None, evidence=f"interpretability_rating={ir}"
            ))

    # 4) Pre-deployment testing & pen test done
    if ps.get("penetration_tested") and ps.get("pre_deployment_testing"):
        cid = "ICO-Audit Pre-Deployment-Testing"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Pre-deployment testing policy applied and penetration testing completed.",
                mitigation=None, evidence="penetration_tested=True; pre_deployment_testing=True"
            ))

    # 5) Performance threshold met
    if ps.get("domain_threshold_met") and _has_real_number(ps.get("validation_score")):
        cid = "ISO 42001 §8.3 Design-Development"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Performance meets planned domain threshold with recorded validation score.",
                mitigation=None, evidence=f"validation_score={ps.get('validation_score')}"
            ))

    # 6) Robustness above baseline
    if ps.get("robustness_above_baseline"):
        cid = "ISO 42001 AnnexA A.6.5 Robustness-Accuracy"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Robustness testing is above baseline according to stress/adversarial evaluations.",
                mitigation=None, evidence="robustness_above_baseline=True"
            ))

    # 7) Accountability clear
    if ps.get("accountable_owner") and ps.get("escalation_route"):
        cid = "DSIT §3.2.3 Accountability"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Clear accountability and escalation route are defined across the lifecycle.",
                mitigation=None, evidence=str(ps.get("accountable_owner"))
            ))

    # 8) Data quality controls in place 
    if ps.get("data_quality_checks") and _has_real_number(ps.get("validation_score")):
        cid = "ISO 42001 AnnexA A.6.2 Data-Quality"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="Data quality controls evidenced by validation score and explicit data-quality checks.",
                mitigation=None, evidence=f"validation_score={ps.get('validation_score')}; data_quality_checks=True"
            ))

    # 9) Probabilistic labelling & context provided to users 
    if ps.get("outputs_exposed_to_end_users") and ps.get("output_label_includes_probabilistic"):
        cid = "ICO-Audit Inference-Labeling"
        if has_clause(cid):
            greens.append(Flag(
                id=cid, clause=cid, severity="green",
                reason="User-facing outputs are clearly labelled as probabilistic with provenance/context.",
                mitigation=None, evidence="output_label_includes_probabilistic=True"
            ))

    return greens[:8]  # keep tidy

# ────────────────────────────────────────────────────────────────────────────────
# Metadata enrichment

def _lookup_clause_meta(clause_id: str, hits: List[SearchHit]) -> Optional[Dict[str, Any]]:
    cid = (clause_id or "").strip().lower()
    if cid:
        for c in POLICY:
            if (c.id or "").strip().lower() == cid or (c.label or "").strip().lower() == cid:
                return {
                    "label": c.label, "link": c.link, "framework": c.framework,
                    "document": c.document, "phase": c.phase or _infer_phase(c)
                }
    if hits:
        c = hits[0].clause
        return {
            "label": c.label, "link": c.link, "framework": c.framework,
            "document": c.document, "phase": c.phase or _infer_phase(c),
            "matched_by": "retrieval",
        }
    return None


def _best_hit_for_reason(hits: List[SearchHit], reason: str) -> Optional[Dict[str, Any]]:
    if not hits:
        return None
    reason_l = (reason or "").lower()
    best = None
    best_score = -1.0
    for h in hits[:8]:
        c = h.clause
        sim = SequenceMatcher(None, reason_l, (c.text or "").lower()).ratio()
        score = 0.7 * float(h.score) + 0.3 * float(sim)
        if score > best_score:
            best_score = score
            best = c
    if not best:
        best = hits[0].clause
    return {
        "label": best.label, "link": best.link, "framework": best.framework,
        "document": best.document, "phase": best.phase or _infer_phase(best),
        "matched_by": "reason-best-hit",
    }

# ────────────────────────────────────────────────────────────────────────────────
# Endpoints

@app.get("/ping")
def ping():
    return {"msg": "pong"}


@app.get("/clauses", response_model=List[PolicyClause])
def list_clauses():
    return POLICY


@app.get("/admin/reload")
def admin_reload():
    load_policy_corpus()
    return {"ok": True, "count": len(POLICY), "version": POLICY_VERSION}


@app.post("/search", response_model=List[SearchHit])
def search(q: SearchQuery):
    return retrieve(q.q, top_k=q.top_k, frameworks=q.frameworks)


@app.post("/analyse", response_model=AnalysisOut)
def analyse(payload: ProjectInput):
    t0 = time.perf_counter()

    hits = retrieve(
        q=f"{payload.title}\n{payload.description}\n{payload.model_type}\n{payload.deployment_env}",
        top_k=20,
        frameworks=None,
    )
    t_retrieve = (time.perf_counter() - t0) * 1000.0

    system = build_system()
    user = build_user(payload, hits)
    schema_hint = default_schema_hint()

    t1 = time.perf_counter()
    llm_out: Dict[str, Any] = {"flags": []}
    if USE_LLM:
        try:
            llm_out = generate_flags(system=system, user=user, json_schema_hint=schema_hint)
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            llm_out = {"flags": []}
    t_llm = (time.perf_counter() - t1) * 1000.0

    # ── Collect model flags and enforce VALID_CLAUSE_IDS guard ────────────────
    valid_ids = {(h.clause.id or "").strip().lower() for h in hits}
    model_flags: List[Flag] = []
    for f in llm_out.get("flags", []):
        try:
            clause_id = (f.get("clause") or f.get("id") or "").strip()
            meta = f.get("meta") or {}

            enrich = _lookup_clause_meta(clause_id, hits)
            if not enrich:
                enrich = _best_hit_for_reason(hits, f.get("reason", "")) or {}

            f["meta"] = {**meta, **enrich}

            if not clause_id and enrich.get("label"):
                for h in hits:
                    if (h.clause.label or "").strip().lower() == (enrich.get("label") or "").strip().lower():
                        f["clause"] = h.clause.id
                        clause_id = h.clause.id
                        break

            # Drop any LLM flag whose clause is not in VALID_CLAUSE_IDS
            if (clause_id or "").strip().lower() not in valid_ids:
                logger.info(f"Dropping LLM flag with out-of-scope clause: {f.get('clause')!r}")
                continue

            model_flags.append(Flag(**f))
        except Exception as e:
            logger.warning(f"Skipped malformed LLM flag: {e}")

    # ── Legacy rules ─────────────────────────────────────────────────────────
    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    legacy_flags: List[Flag] = []
    for rule in RULES:
        try:
            if evaluate_rule(rule, payload_dict):
                clause_id = str(rule.get("clause", "")) or ""
                meta = _lookup_clause_meta(clause_id, hits) or {"source": "legacy-rule"}
                legacy_flags.append(
                    Flag(
                        id=str(rule.get("id", "")),
                        clause=clause_id or (meta.get("label") or "unknown"),
                        severity=_coerce_severity(rule.get("severity", "green")),
                        reason=str(rule.get("reason", "")),
                        mitigation=rule.get("mitigation"),
                        meta={**meta, "source": "legacy-rule"},
                    )
                )
        except Exception as e:
            logger.error(f"Error evaluating legacy rule {rule.get('id')}: {e}")

    all_flags: List[Flag] = model_flags + legacy_flags

    # If nothing fired, create GREEN checks so dashboards show positive compliance
    if not all_flags:
        all_flags = _synthesise_green_flags(payload, hits)

    debug = AnalysisDebug(
        retrieved=hits,
        prompt=f"system:\n{system}\n\nuser:\n{user}",
        raw_response="",
        timings_ms={"retrieval": t_retrieve, "llm": t_llm},
    )
    return AnalysisOut(flags=all_flags, debug=debug, corpus_version=POLICY_VERSION)

# ────────────────────────────────────────────────────────────────────────────────
# Report export (F07 – Should)
# POST body expects: { "project": ProjectInput, "flags": Flag[] }
# Renders Markdown → PDF via WeasyPrint if available; falls back to ReportLab.
# ────────────────────────────────────────────────────────────────────────────────
def _render_markdown(project: ProjectInput, flags: List[Flag]) -> str:
    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    reds = sum(1 for f in flags if f.severity == "red")
    ambers = sum(1 for f in flags if f.severity == "amber")
    greens = sum(1 for f in flags if f.severity == "green")

    def risk_label():
        if reds > 0: return "High"
        if ambers >= 2: return "Medium"
        return "Low"

    lines = []
    lines.append(f"# AI-Impact UK Report – {project.title}")
    lines.append(f"_Generated: {now}_  \n_Version: {POLICY_VERSION}_")
    lines.append("")
    lines.append("## Project")
    lines.append(f"**Description:** {project.description}")
    lines.append(f"**Model type:** {project.model_type or '—'}  |  **Env:** {project.deployment_env or '—'}")
    lines.append("")
    lines.append(f"## Summary  \n**Risk:** {risk_label()}  |  **Red:** {reds}  **Amber:** {ambers}  **Green:** {greens}")
    lines.append("")
    lines.append("## Flags")
    lines.append("| Severity | Clause | Reason | Mitigation |")
    lines.append("|---|---|---|---|")
    for f in flags:
        clause = (f.meta.get("label") if (f.meta and isinstance(f.meta, dict) and f.meta.get("label")) else f.clause)
        lines.append(f"| {f.severity.upper()} | {clause} | {f.reason} | {f.mitigation or '—'} |")
    return "\n".join(lines)

def _markdown_to_pdf(md_text: str) -> bytes:
    # Try WeasyPrint (Markdown -> HTML -> PDF)
    try:
        import markdown as md
        from weasyprint import HTML
        html = md.markdown(md_text, extensions=["tables", "fenced_code"])
        css = """
        body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        h1,h2,h3 { margin: 0.4rem 0 0.2rem; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        th { text-align: left; }
        """
        return HTML(string=f"<style>{css}</style>{html}").write_pdf()
    except Exception as e:
        logger.info(f"WeasyPrint not available or failed ({e}); falling back to ReportLab.")
        # Fallback: simple text PDF
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import mm
        except Exception as e2:
            raise RuntimeError(f"No PDF backend available: {e2}") from e

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        x, y = 20*mm, height - 20*mm
        for line in md_text.splitlines():
            if y < 20*mm:
                c.showPage()
                y = height - 20*mm
            c.drawString(x, y, line[:120])
            y -= 12
        c.save()
        return buffer.getvalue()

@app.post("/report/{project_id}")
def report(project_id: str, body: Dict[str, Any] = Body(...)):
    try:
        project = ProjectInput(**(body.get("project") or {}))
        raw_flags = body.get("flags") or []
        flags: List[Flag] = [Flag(**f) if isinstance(f, dict) else f for f in raw_flags]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    md = _render_markdown(project, flags)
    try:
        pdf_bytes = _markdown_to_pdf(md)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    filename = f"AI-Impact-UK_Report_{project_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/telemetry")
async def telemetry(req: Request):
    try:
        body = await req.json()
    except Exception:
        body = {}

    # 1) Consent gate (hard stop)
    if not bool(body.get("consented", False)):
        # Do not log anything if not consented
        return {"ok": False, "reason": "not consented"}

    # 2) Build a content-free, strict whitelist
    def as_int(x, default=0):
        try:
            return int(x)
        except Exception:
            return default

    now_iso = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    # Only allow known meta keys (no free text)
    META_ALLOW = {
        "projectId",                 # number
        "modelType",                 # short token,
        "processesPersonalData",     # boolean
        "hasSpecialCategoryData",    # boolean
        "format",                    # "pdf" | "md"
        "action",                    # short token
        "durationMs",
    }
    
    raw_meta = body.get("meta") or {}
    meta = {}
    for k in META_ALLOW:
        if k in raw_meta:
            v = raw_meta[k]
            # normalise booleans/ints/short tokens only
            if isinstance(v, bool) or v is None:
                meta[k] = v
            elif k == "projectId":
                meta[k] = as_int(v, 0)
            elif k == "durationMs":
                try:
                    meta[k] = max(0, int(v))
                except Exception:
                    meta[k] = 0
            else:
                s = str(v)[:32]
                s = "".join(ch for ch in s if ch.isalnum() or ch in "-_:.")
                meta[k] = s

    # Safe event token
    ev = str(body.get("event", ""))[:64].lower()
    event = "".join(ch for ch in ev if ch.isalnum() or ch in "-_:.") or "unknown"

    # Screen dims (numbers only)
    scr = body.get("screen") or {}
    screen = {
        "w": as_int(scr.get("w"), 0),
        "h": as_int(scr.get("h"), 0),
    }

    # Short session token
    sess = str(body.get("session", ""))[:24]
    session = "".join(ch for ch in sess if ch.isalnum())

    # Timestamp (client ts if provided, else server time)
    ts = body.get("ts")
    if not isinstance(ts, str) or len(ts) > 40:
        ts = now_iso

    safe = {
        "event": event,
        "ts": ts,
        "projectId": meta.get("projectId", 0),
        "session": session,
        "screen": screen,
        "meta": meta,
    }

    logger.info(f"Telemetry {json.dumps(safe, ensure_ascii=False)}")
    return {"ok": True}