# backend/llm.py
from __future__ import annotations

import os
import json
import re
from typing import Any, Dict, Optional

import requests

# ── Config via env ──────────────────────────────────────────────────────────────
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct")
# Tunables
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "512"))
OLLAMA_NUM_CTX     = int(os.getenv("OLLAMA_NUM_CTX", "8192"))
OLLAMA_TIMEOUT_S   = int(os.getenv("OLLAMA_TIMEOUT_S", "120"))

# ── Helpers ────────────────────────────────────────────────────────────────────
_JSON_FENCE = re.compile(r"```json\s*(.+?)\s*```", flags=re.S)

def _extract_any_json(text: str) -> Optional[Any]:
    """Try fenced ```json```, then [ ... ], then { ... }."""
    m = _JSON_FENCE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    for open_ch, close_ch in ("[", "]"), ("{", "}"):
        try:
            s = text.find(open_ch)
            e = text.rfind(close_ch)
            if s != -1 and e != -1 and e > s:
                return json.loads(text[s:e+1])
        except Exception:
            pass
    return None

def _coerce_severity(val: Any) -> str:
    v = (str(val or "")).strip().lower()
    return "red" if v.startswith("r") else "amber" if v.startswith("a") else "green"

def _normalise_flag(d: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure every flag has the fields your API/UI expects."""
    return {
        "id":         str(d.get("id") or d.get("clause") or "").strip(),
        "clause":     str(d.get("clause") or d.get("id") or "").strip(),
        "severity":   _coerce_severity(d.get("severity")),
        "reason":     (d.get("reason") or "").strip(),
        "mitigation": d.get("mitigation", None),
        # Optional extras (backend will enrich meta.link etc.)
        "evidence":   d.get("evidence", None),
        "model":      OLLAMA_MODEL,
        "meta":       d.get("meta", None),
    }

def _ensure_flags_container(obj: Any) -> Dict[str, Any]:
    """Accept list or {'flags': [...]}; return {'flags': [...]}."""
    if isinstance(obj, list):
        return {"flags": obj}
    if isinstance(obj, dict) and isinstance(obj.get("flags"), list):
        return {"flags": obj["flags"]}
    return {"flags": []}

# ── Main call ──────────────────────────────────────────────────────────────────
def generate_flags(
    system: str,
    user: str,
    json_schema_hint: str,
    temperature: Optional[float] = None,
    retry_on_empty: bool = True,
) -> Dict[str, Any]:
    t = OLLAMA_TEMPERATURE if temperature is None else float(temperature)

    prompt = (
        f"{user}\n\n"
        f"Follow this JSON schema strictly:\n{json_schema_hint}\n\n"
        f"Return ONLY JSON (no extra text)."
    )

    def _call_once(temp: float) -> Dict[str, Any]:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "format": "json",  #Ollama to returns a JSON string in 'response'
            "options": {
                "temperature": temp,
                "num_predict": OLLAMA_NUM_PREDICT,
                "num_ctx": OLLAMA_NUM_CTX,
            },
        }
        r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=OLLAMA_TIMEOUT_S)
        r.raise_for_status()
        raw = r.json().get("response", "")

        # In JSON mode the whole thing is JSON already
        try:
            parsed: Any = json.loads(raw)
        except Exception:
            parsed = _extract_any_json(raw)

        container = _ensure_flags_container(parsed)
        container["flags"] = [
            _normalise_flag(x) for x in container.get("flags", []) if isinstance(x, dict)
        ]
        return container

    result = _call_once(t)

    # slightly higher temp and stronger instruction
    if retry_on_empty and not result["flags"]:
        retry_system = system + (
            "\nBe decisive. If evidence is partial, emit AMBER with a concise 'because' and a concrete mitigation. "
            "If clearly compliant, emit GREEN with a short justification."
        )
        retry_user = user + "\nIf you cannot find any issues, still emit at least one GREEN item that explains why."
        return generate_flags(
            system=retry_system,
            user=retry_user,
            json_schema_hint=json_schema_hint,
            temperature=max(0.3, t + 0.1),
            retry_on_empty=False,
        )

    return result

# ── JSON schema hint for the model ─────────────────────────────────────────────
def default_schema_hint() -> str:
    return """
    {
      "type": "object",
      "properties": {
        "flags": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id":        {"type":"string"},
              "clause":    {"type":"string"},
              "severity":  {"type":"string","enum":["red","amber","green"]},
              "reason":    {"type":"string"},
              "mitigation":{"type":["string","null"]},
              "evidence":  {"type":["string","null"]},
              "meta":      {"type":["object","null"]}
            },
            "required": ["id","clause","severity","reason"]
          }
        }
      },
      "required": ["flags"]
    }
    """.strip()
