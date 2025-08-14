from __future__ import annotations
import os, json, re, time
import requests
from typing import Dict, Any, Optional

OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")

def _extract_json(s: str) -> Optional[Dict[str, Any]]:
    """Best-effort: pull the first {...} or ```json ... ``` block and parse."""
    # fenced first
    m = re.search(r"```json\s*(\{.*?\})\s*```", s, flags=re.S)
    if not m:
        m = re.search(r"(\{.*\})", s, flags=re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None

def generate_flags(system: str, user: str, json_schema_hint: str, temperature: float = 0.2) -> Dict[str, Any]:
    """Calls Ollama /generate. Returns dict with 'flags' list."""
    prompt = (
        f"<|system|>\n{system}\n\n"
        f"<|user|>\n{user}\n\n"
        f"Follow the JSON schema strictly:\n{json_schema_hint}\n"
        f"Return ONLY the JSON, no prose."
    )
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "options": {
            "temperature": temperature,
        },
        "stream": False,
    }
    r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=120)
    r.raise_for_status()
    txt = r.json().get("response", "")

    # Parse JSON
    data = _extract_json(txt) or {}
    if "flags" not in data or not isinstance(data["flags"], list):
        data = {"flags": []}
    # normalize fields
    for f in data["flags"]:
        f.setdefault("severity", "amber")
        f.setdefault("mitigation", None)
        f.setdefault("clause", "")
        f.setdefault("id", "")
        f.setdefault("reason", "")
        f.setdefault("link", "")
    return data
