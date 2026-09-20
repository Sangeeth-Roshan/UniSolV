# UniSOLV — Civic Issue Reporting Platform

> **Status:** Scaffold v0.1 — structure only, no business logic implemented.

UniSOLV is a platform that connects citizens, institutions, and government bodies to report, track, and resolve civic issues efficiently.

---

## Monorepo Structure

```
UniSOLV/
├── frontend/          # Next.js 14 (App Router) + TypeScript + Tailwind CSS
├── backend/           # Python FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── api/           # Route handlers
│   │   ├── core/          # Config, DB engine
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic stubs (classification, routing, reputation, escalation)
│   │   └── ml/            # ML stubs (embeddings, clustering, classification_providers)
│   └── alembic/       # Database migrations
└── infra/
    ├── docker-compose.yml
    └── init-db/       # SQL init scripts (PostGIS)
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24+ |
| Docker Compose | v2 (plugin) |
| Node.js *(local dev only)* | 18+ |
| Python *(local dev only)* | 3.11+ |

---

## 🚀 Running Locally with Docker Compose

```bash
# From the /infra directory:
cd infra
docker-compose up --build
```

This will start four services:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Next.js UI shell |
| **Backend API** | http://localhost:8000 | FastAPI, docs at `/docs` |
| **PostgreSQL** | localhost:5432 | Postgres 16 + PostGIS 3.4 |
| **Redis** | localhost:6379 | Session / cache store |

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (full reset)

```bash
docker-compose down -v
```

---

## Verifying the Stack

```bash
# 1. Backend health check
curl http://localhost:8000/health
# → {"status":"ok","version":"0.1.0"}

# 2. Confirm PostGIS is enabled
docker exec unisolv-postgres psql -U postgres -d unisolv \
  -c "SELECT PostGIS_Version();"
# → Returns PostGIS version string

# 3. Frontend
open http://localhost:3000
```

---

## Frontend Routes

| Route | Role | Description |
|-------|------|-------------|
| `/` | All | Home / landing shell |
| `/submit` | Citizen | Submit a new civic issue |
| `/dashboard/institution` | Institution | Institution issue management |
| `/dashboard/government` | Government | City-wide analytics |
| `/login` | All | Authentication (placeholder) |

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Edit DATABASE_URL / REDIS_URL to point at local services
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Database Migrations (Alembic)

```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "describe your change"

# Apply all pending migrations
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

---

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for all supported variables.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async Postgres URL |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |
| `SECRET_KEY` | `change-me-in-production` | JWT / session secret |
| `ENVIRONMENT` | `development` | `development` \| `production` |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7 |
| Containerisation | Docker, Docker Compose v2 |

---

## Demo & Analytics

### Seeding Data
To populate a realistic dataset (including institutions, users, mapped hotspots, and escalated tickets) for the demo, run the seed script:
```bash
cd backend
python scripts/seed_demo.py
```

### Analytics Dashboard
Once seeded, you can view the rich analytics dashboard locally at:
http://localhost:3000/dashboard/government/analytics

### Toggling Classifier Mode
You can hot-swap the ML classification backend between `cached` and `live` (LLM) modes without restarting the server via the admin API:
```bash
curl -X POST http://localhost:8000/api/admin/classifier-mode \
  -H "Authorization: Bearer <GOV_OFFICER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "live"}'
```

When setting up the database, ensure you run migrations all the way to `head`. The migration chain is as follows:
- `0001_initial_schema`: Base tables.
- `0002_clustering_additions`: Clustering additions (e.g., aggregate_severity_score, representative_embedding, new event types).
- `c8cfcd496f41`: Adds `public_good_consent` to `tickets` (missing from `0001`).

### Demo Credentials
After running the seed script, you can log in with:

**Citizen:**
- Email: `citizen@test.com`
- Password: `demo123`

**Government Officer (Admin/Analytics access):**
- Email: `admin@gov.in`
- Password: `demo123`
