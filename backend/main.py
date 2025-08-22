# backend/main.py
from __future__ import annotations

import hashlib
import json
import logging
import os
import pathlib
import time
import re
from typing import Any, Dict, List, Optional
from difflib import SequenceMatcher

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
# ────────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="AI-Impact UK API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allow disabling LLM for A/B or offline runs
USE_LLM = os.getenv("USE_LLM", "true").lower() == "true"

# ────────────────────────────────────────────────────────────────────────────────
# Load rules.yaml (legacy heuristic flags; optional – kept for continuity)
# ────────────────────────────────────────────────────────────────────────────────
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
    """Very small legacy trigger engine; returns True if rule applies."""
    trig = rule.get("trigger", {})
    reasons = []

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
        if not rating or (isinstance(rating, str) and rating.strip() == ""):
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
        if actual is None:
            if expected is False:
                reasons.append("model cards not planned (absent field)")
            else:
                return False
        else:
            if actual == expected:
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
        if not payload.get("penetration_tested", False):
            reasons.append("penetration/red-team testing missing")
        else:
            return False
        
        # ----- new triggers (first-class fields) -----

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
        # require that at least one of expected audiences is present
        expected = [str(x).strip().lower() for x in trig["documentation_consumers_includes"]]
        got = [str(x).strip().lower() for x in (payload.get("documentation_consumers") or [])]
        if not any(x in got for x in expected):
            reasons.append(f"documentation not planned for {expected}")
        else:
            return False

    if trig.get("community_reviews_missing_for_personal_data"):
        if payload.get("processes_personal_data") and not payload.get("community_reviews"):
            reasons.append("no community/affected-group reviews despite personal data")
        else:
            return False

    return bool(reasons)


# ────────────────────────────────────────────────────────────────────────────────
# Policy corpus + Retrieval (TF-IDF)
# ────────────────────────────────────────────────────────────────────────────────
POLICY: List[PolicyClause] = []
POLICY_VERSION: str = ""  # computed hash of the loaded corpus
_vectorizer: Optional[TfidfVectorizer] = None
_matrix = None  # sparse


def _infer_phase(c: PolicyClause) -> str:
    """Heuristic lifecycle phase: data | model | deployment."""
    cat = (c.category or "").lower()
    lab = (c.label or "").lower()
    txt = f"{cat} {lab} {(c.text or '').lower()}"

    data_kw = [
        "data", "privacy", "personal", "retention", "consent",
        "provenance", "access control", "collection", "minimisation",
    ]
    model_kw = [
        "fairness", "bias", "explain", "interpret", "transparen", "accuracy",
        "robust", "testing", "validation", "documentation", "model card",
    ]
    deploy_kw = [
        "monitor", "incident", "security", "ops", "operation", "post", "drift",
        "change", "audit", "retraining", "deployment",
    ]

    def has_any(words): return any(w in txt for w in words)
    if has_any(data_kw): return "data"
    if has_any(model_kw): return "model"
    if has_any(deploy_kw): return "deployment"
    fw = (c.framework or "").upper()
    if fw == "ICO": return "data"
    if fw == "DSIT": return "model"
    return "deployment"


def load_policy_corpus() -> None:
    """Load policy_corpus.json exported from the frontend; tolerate empty/invalid."""
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
    """Return diverse top_k SearchHit for the query, interleaving frameworks."""
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

    # bucket by framework
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

    # round-robin interleave
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
# ────────────────────────────────────────────────────────────────────────────────
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
    # helper to stringify list-like fields safely
    def join_list(val) -> str:
        try:
            if val is None:
                return ""
            if isinstance(val, (list, tuple, set)):
                return ", ".join([str(x) for x in val if x is not None])
            # allow comma/semicolon/newline separated strings
            if isinstance(val, str):
                parts = [s.strip() for s in re.split(r"[,;\n]", val) if s.strip()]
                return ", ".join(parts)
            return str(val)
        except Exception:
            return ""

    desc = (getattr(payload, "description", "") or "").strip()
    title = (getattr(payload, "title", "") or "").strip()

    # Safe reads with sensible defaults
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

    # Pack a compact clause table for context + strict ID list
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



# ────────────────────────────────────────────────────────────────────────────────
# Metadata enrichment
# ────────────────────────────────────────────────────────────────────────────────
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
# ────────────────────────────────────────────────────────────────────────────────
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

    llm_flags: List[Flag] = []
    for f in llm_out.get("flags", []):
        try:
            clause_id = f.get("clause") or f.get("id") or ""
            meta = f.get("meta") or {}

            enrich = _lookup_clause_meta(clause_id, hits)
            if not enrich:
                enrich = _best_hit_for_reason(hits, f.get("reason", "")) or {}

            f["meta"] = {**meta, **enrich}

            if not clause_id and enrich.get("label"):
                for h in hits:
                    if h.clause.label == enrich["label"]:
                        f["clause"] = h.clause.id
                        break

            llm_flags.append(Flag(**f))
        except Exception as e:
            logger.warning(f"Skipped malformed LLM flag: {e}")

    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    for rule in RULES:
        try:
            if evaluate_rule(rule, payload_dict):
                clause_id = str(rule.get("clause", "")) or ""
                meta = _lookup_clause_meta(clause_id, hits) or {"source": "legacy-rule"}
                llm_flags.append(
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

    debug = AnalysisDebug(
        retrieved=hits,
        prompt=f"system:\n{system}\n\nuser:\n{user}",
        raw_response="",
        timings_ms={"retrieval": t_retrieve, "llm": t_llm},
    )
    return AnalysisOut(flags=llm_flags, debug=debug, corpus_version=POLICY_VERSION)
