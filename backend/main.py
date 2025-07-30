from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
import pathlib
import yaml
import json

from db import engine, create_db_and_tables
from models import Project, Assessment
from schemas import ProjectInput, AnalysisOut, Flag

app = FastAPI()

# ── CORS ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_methods=['POST', 'GET', 'DELETE'],
    allow_headers=['*'],
)

# ── Ensure DB tables exist ──────────────────────────
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ── Load rules.yaml (robust) ────────────────────────
rules_path = pathlib.Path(__file__).with_name("rules.yaml")
if not rules_path.exists():
    RULES = []
else:
    loaded = yaml.safe_load(rules_path.read_text())
    RULES = loaded["rules"] if isinstance(loaded, dict) else loaded

# ── Health check ────────────────────────────────────
@app.get("/ping")
def ping():
    return {"msg": "pong"}

# ── Analyse and persist assessment ──────────────────
@app.post("/analyse", response_model=AnalysisOut)
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
    # Save Project + Assessment to DB
    with Session(engine) as session:
        project = Project(
            title=payload.title,
            description=payload.description,
            data_types=json.dumps(payload.data_types),
            model_type=payload.model_type,
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        assessment = Assessment(
            flags=json.dumps([f.dict() for f in flags]),
            project_id=project.id
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
        # Parse JSON flags before returning
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
        # Optionally, delete assessments linked to this project
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
