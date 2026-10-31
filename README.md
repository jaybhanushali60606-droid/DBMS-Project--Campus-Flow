# CampusFlow — College Management System

CampusFlow is a full-stack college management project with a React/TypeScript frontend and a FastAPI/SQLAlchemy backend. It includes student, faculty, course, division, lecture, attendance, examination, result, and role-based dashboard workflows.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Python, FastAPI, SQLAlchemy, Alembic
- Local development database: SQLite
- MySQL schema and SQL examples: `database/`

## Run locally (Windows PowerShell)

### Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The local database defaults to a SQLite file under `backend/`. The backend creates missing tables on startup. Set a private `SECRET_KEY` in your local `.env` before using the app beyond local development. Never commit `.env` or production secrets.

### Optional demo data

`backend/seed.py` creates demo records and sample login accounts. **It first deletes existing application records in the configured database.** Run it only against a fresh/disposable development database, never against valuable data or production. The script contains demo-only credentials; change them before any deployment and do not reuse them.

### Frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local URL (usually `http://localhost:5173`). Keep the backend running in the first terminal.

## Database SQL and course submissions

- `database/` contains the SQLite-oriented schema reference and MySQL schema, joins, triggers, and views.
- `submissions/Experiment_8/` contains the Phase II query implementation (joins, aggregate functions, subqueries).
- `submissions/Experiment_9/` contains the Phase III stored procedures, triggers, views, and verification guide.

The application currently uses SQLite by default. The MySQL files are assignment/reference scripts and do not migrate the application's SQLite records into MySQL. Run schema/object scripts only in a separate MySQL development database.

## Repository hygiene

Local databases, backups, `.env` files, virtual environments, `node_modules`, build output, and generated binaries are intentionally not tracked. Use `.env.example` as a template and keep real credentials private.
