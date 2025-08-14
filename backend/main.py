# backend/main.py
from __future__ import annotations

import json
import logging
import pathlib
import re
import time
from typing import Any, Dict, List, Optional

import requests
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

# ────────────────────────────────────────────────────────────────────────────────
# Load rules.yaml (legacy heuristic flags; optional – kept for continuity)
# ────────────────────────────────────────────────────────────────────────────────
rules_path = pathlib.Path(__file__).with_name("rules.yaml")
try:
    _loaded = yaml.safe_load(rules_path.read_text())
    RULES: List[Dict[str, Any]] = (
        _loaded["rules"] if isinstance(_loaded, dict) and "rules" in _loaded else (_loaded or [])
    )
    logger.info(f"Loaded {len(RULES)} legacy rules.")
except Exception as e:
    logger.warning(f"rules.yaml not loaded ({e}); proceeding without legacy rules.")
    RULES = []


def _ci_equals(a: Any, b: Any) -> bool:
    return isinstance(a, str) and isinstance(b, str) and a.strip().lower() == b.strip().lower()


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

    return bool(reasons)


# ────────────────────────────────────────────────────────────────────────────────
# Policy corpus + Retrieval (TF-IDF)
# ────────────────────────────────────────────────────────────────────────────────
POLICY: List[PolicyClause] = []
_vectorizer: Optional[TfidfVectorizer] = None
_matrix = None  # sparse matrix
_idx_to_framework: List[str] = []


def load_policy_corpus() -> None:
    """Load policy_corpus.json exported from the frontend."""
    global POLICY, _vectorizer, _matrix, _idx_to_framework

    corpus_path = pathlib.Path(__file__).with_name("policy_corpus.json")
    if not corpus_path.exists():
        logger.warning("policy_corpus.json not found. Retrieval will be empty.")
        POLICY = []
        _vectorizer, _matrix, _idx_to_framework = None, None, []
        return

    rows = json.loads(corpus_path.read_text())
    POLICY = [PolicyClause(**row) for row in rows]

    texts = [f"{p.label}. {p.text}" for p in POLICY]
    _idx_to_framework = [p.framework or "" for p in POLICY]

    _vectorizer = TfidfVectorizer(stop_words="english")
    _matrix = _vectorizer.fit_transform(texts)

    logger.info(f"Loaded policy corpus: {len(POLICY)} clauses.")


load_policy_corpus()


def retrieve(q: str, top_k: int = 8, frameworks: Optional[List[str]] = None) -> List[SearchHit]:
    """Return top_k SearchHit for the free-text query."""
    if not POLICY or _vectorizer is None or _matrix is None:
        return []

    vec = _vectorizer.transform([q])
    sims = cosine_similarity(vec, _matrix)[0]  # 1 x N -> array of N

    # Build candidate list
    candidates: List[SearchHit] = []
    for idx, score in enumerate(sims):
        clause = POLICY[idx]
        if frameworks:
            fw = (clause.framework or "").upper()
            if fw not in [f.upper() for f in frameworks]:
                continue
        snippet = (clause.text[:180] + "…") if len(clause.text) > 180 else clause.text
        candidates.append(
            SearchHit(
                clause_id=clause.id,
                score=float(score),
                snippet=snippet,
                clause=clause,
            )
        )

    candidates.sort(key=lambda h: h.score, reverse=True)
    return candidates[:top_k]


# ────────────────────────────────────────────────────────────────────────────────
# Ollama / Llama 3.1-8B-Instruct client
# ────────────────────────────────────────────────────────────────────────────────
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b-instruct"  # pulled already: `ollama pull llama3.1:8b-instruct`


def build_prompt(payload: ProjectInput, hits: List[SearchHit]) -> str:
    """Compose a constrained JSON task for the model."""
    # Pack a compact clause table for context (keep under context window)
    lines = []
    for h in hits:
        c = h.clause
        lines.append(
            f"- id: {c.id}\n  label: {c.label}\n  framework: {c.framework}\n  text: {c.text}"
        )
    clauses_block = "\n".join(lines)

    # Describe the project compactly
    desc = payload.description.strip()
    title = payload.title.strip()

    return f"""You are an AI governance assessor. You convert UK AI policy clauses into actionable checks.

Project:
- title: {title}
- description: {desc}
- model_type: {payload.model_type}
- deployment_env: {payload.deployment_env}
- data_types: {', '.join(payload.data_types or [])}
- privacy: processes_personal_data={payload.processes_personal_data}, special_category_data={payload.special_category_data}
- explainability_tooling: {payload.explainability_tooling}
- interpretability_rating: {payload.interpretability_rating}
- fairness_definition: {', '.join(payload.fairness_definition or [])}
- accountable_owner: {payload.accountable_owner}
- model_cards_published: {payload.model_cards_published}
- safety: harms={', '.join(payload.credible_harms or [])}, mitigations={', '.join(payload.safety_mitigations or [])}, drift_detection={payload.drift_detection}, retraining_cadence={payload.retraining_cadence}, penetration_tested={payload.penetration_tested}

Candidate policy clauses (DSIT, ICO, ISO):
{clauses_block}

TASK:
1) Use only the clauses above to evaluate the project.
2) Produce a JSON array named "flags" (and nothing else). Each item must be:
   {{
     "id": "<clause id>",
     "clause": "<clause id again>",
     "severity": "red" | "amber" | "green",
     "reason": "<one-sentence 'because' explanation that references project facts>",
     "mitigation": "<concrete step>"  // may be null
   }}
3) Be conservative: choose "green" only when clearly compliant; use "amber" for partial/uncertain; "red" for clear gaps.
4) Return just the JSON array; do not add commentary.
"""
    

def call_ollama(prompt: str) -> str:
    """Call Ollama and return the raw 'response' text."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_ctx": 8192,
        },
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    data = r.json()
    return data.get("response", "")


def _extract_json_array(text: str) -> List[Dict[str, Any]]:
    """
    Try to robustly parse a JSON array from LLM output.
    We search first '[' ... last ']' to avoid stray text.
    """
    try:
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
    except Exception:
        pass
    # Try fence pattern ```json ... ```
    m = re.search(r"```json\s*(\[.*?\])\s*```", text, flags=re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return []


def _coerce_severity(val: Any) -> str:
    v = str(val).strip().lower()
    if v in {"red", "amber", "green"}:
        return v
    return "green"


# ────────────────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────────────────
@app.get("/ping")
def ping():
    return {"msg": "pong"}


@app.get("/clauses", response_model=List[PolicyClause])
def list_clauses():
    return POLICY


@app.post("/search", response_model=List[SearchHit])
def search(q: SearchQuery):
    return retrieve(q.q, top_k=q.top_k, frameworks=q.frameworks)


@app.post("/analyse", response_model=AnalysisOut)
def analyse(payload: ProjectInput):
    t0 = time.perf_counter()

    # 1) Retrieve relevant clauses from the policy corpus
    hits = retrieve(
        q=f"{payload.title}\n{payload.description}\n{payload.model_type}\n{payload.deployment_env}",
        top_k=10,
        frameworks=None,
    )
    t_retrieve = (time.perf_counter() - t0) * 1000.0

    # 2) Build prompt + call LLM
    prompt = build_prompt(payload, hits)
    t1 = time.perf_counter()
    raw_response = ""
    try:
        raw_response = call_ollama(prompt)
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        raw_response = "[]"
    t_llm = (time.perf_counter() - t1) * 1000.0

    # 3) Parse flags from LLM output
    llm_flags_json = _extract_json_array(raw_response)
    llm_flags: List[Flag] = []
    for item in llm_flags_json:
        try:
            fid = str(item.get("id") or item.get("clause") or "unknown")
            clause_id = str(item.get("clause") or fid)
            reason = str(item.get("reason") or "").strip()
            mitigation = item.get("mitigation")
            sev = _coerce_severity(item.get("severity"))

            # Enrich with clickable metadata when we can find the clause
            meta = None
            evidence = None
            model = OLLAMA_MODEL
            # attach link/label if present
            c = next((h.clause for h in hits if h.clause.id == clause_id), None)
            if c:
                meta = {"label": c.label, "link": c.link, "framework": c.framework, "document": c.document}

            llm_flags.append(
                Flag(
                    id=fid,
                    clause=clause_id,
                    severity=sev,  # type: ignore
                    reason=reason,
                    mitigation=mitigation,
                    evidence=evidence,
                    model=model,
                    meta=meta,
                )
            )
        except Exception as e:
            logger.warning(f"Skipped malformed LLM flag: {e}")

    # 4) (Optional) add legacy rule-based flags for extra coverage
    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    for rule in RULES:
        try:
            if evaluate_rule(rule, payload_dict):
                llm_flags.append(
                    Flag(
                        id=str(rule.get("id", "")),
                        clause=str(rule.get("clause", "")),
                        severity=_coerce_severity(rule.get("severity", "green")),  # type: ignore
                        reason=str(rule.get("reason", "")),
                        mitigation=rule.get("mitigation"),
                        meta={"source": "legacy-rule"},
                    )
                )
        except Exception as e:
            logger.error(f"Error evaluating legacy rule {rule.get('id')}: {e}")

    # 5) Return with debug block (good for audits and tuning)
    debug = AnalysisDebug(
        retrieved=hits,
        prompt=prompt,
        raw_response=raw_response,
        timings_ms={"retrieval": t_retrieve, "llm": t_llm},
    )
    return AnalysisOut(flags=llm_flags, debug=debug)
