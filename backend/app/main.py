import sys
from pathlib import Path
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Ensures all models are registered with Base.metadata

# API Routers
from app.api.auth import router as auth_router
from app.api.departments import router as departments_router
from app.api.faculty import router as faculty_router
from app.api.courses import router as courses_router
from app.api.students import router as students_router
from app.api.lectures import router as lectures_router
from app.api.attendance import router as attendance_router
from app.api.exams import router as exams_router
from app.api.results import router as results_router
from app.api.rooms import router as rooms_router
from app.api.schedules import router as schedules_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router
from app.api.divisions import router as divisions_router

# Create all database tables (guarantees schema exists)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CampusFlow College Management System API: Academics, Attendance, Examinations, and Classroom Scheduling.",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all Routers under both /api/v1 and /api for frontend convenience
routers = [
    auth_router,
    departments_router,
    faculty_router,
    courses_router,
    students_router,
    lectures_router,
    attendance_router,
    exams_router,
    results_router,
    rooms_router,
    schedules_router,
    reports_router,
    dashboard_router,
    divisions_router,
]

for r in routers:
    app.include_router(r, prefix="/api/v1")
    app.include_router(r, prefix="/api")

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to CampusFlow API.",
        "documentation": "/docs",
        "health": "/health"
    }
