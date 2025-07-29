from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import ProjectInput, AnalysisOut, Flag
import pathlib, yaml

app = FastAPI()

# ── CORS so the Next.js front‑end can talk to us ───────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_methods=['POST', 'GET'],
    allow_headers=['*'],
)

# ── Load rules.yaml (robust) ────────────────────────────────────────────
rules_path = pathlib.Path(__file__).with_name("rules.yaml")
if not rules_path.exists():
    RULES = []                       # start with zero rules
else:
    loaded = yaml.safe_load(rules_path.read_text())
    RULES = loaded["rules"] if isinstance(loaded, dict) else loaded

# ── API endpoints ───────────────────────────────────────────────────────
@app.get("/ping")
def ping():
    return {"msg": "pong"}

@app.post("/analyse", response_model=AnalysisOut)   # British spelling ✔
def analyse(payload: ProjectInput):
    flags = []
    for rule in RULES:
        trig = rule["trigger"]
        if (
            ("data_types" in trig and any(dt in payload.data_types for dt in trig["data_types"]))
            or ("model_type" in trig and payload.model_type in trig["model_type"])
        ):
            flags.append(
                Flag(
                    id=rule["id"],
                    clause=rule["clause"],
                    severity=rule["severity"],
                    reason=rule["reason"],
                    mitigation=rule.get("mitigation"),
                )
            )
    return AnalysisOut(flags=flags)
