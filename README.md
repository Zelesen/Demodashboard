# Bright Smiles Dental Dashboard

A full-stack dental practice analytics dashboard for monitoring KPIs across finance, operations, clinical performance, and NHS contract delivery. Built for dental group practices to provide real-time business intelligence.

## Features

- **Dashboard** — KPI metric cards, practice league table, interactive map, health score gauge, NHS UDA delivery glidepath, AI-powered insights panel
- **Appointments** — Trend analysis, status breakdown, heatmaps, cancellations, lifecycle analysis
- **Invoices** — Revenue tracking, outstanding amounts, collection rates, top patients
- **Treatment Plans** — Completion rates, funnel analysis, value distribution
- **Payments** — Method breakdown, trends by site and practitioner
- **NHS Contracts** — UDA delivery tracking, value distribution, contract timeline
- **Clinicians** — League table ranked by production, per-session metrics
- **Finance** — Revenue streams, profit per practice
- **Sales** — Sales and marketing metrics
- **Custom Dashboards** — AI-prompt-driven dashboard builder with drag-and-drop widget library
- **Chat IDA** — Natural language AI assistant ("Intelligent Dental Assistant") for querying practice data
- **Authentication** — Supabase Auth with email/password login

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v7 |
| **Charts** | ApexCharts, Recharts |
| **Maps** | Leaflet / react-leaflet |
| **Animations** | Framer Motion v12 |
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | PostgreSQL 17 via Supabase |
| **Auth** | Supabase Auth (JWT) |
| **Deployment** | Railway (backend), Vercel (frontend) |

## Project Structure

```
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # API server (all endpoints)
│   ├── precompute.py           # Cache precomputation script
│   ├── cache/                  # JSON cache files (~292)
│   ├── requirements.txt
│   └── .env
│
├── dashboard-frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page-level route components
│   │   ├── lib/                # Utilities (Supabase client, formatting)
│   │   └── assets/             # Static assets
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── supabase/                   # Supabase local development
│   └── config.toml
│
├── railway.json                # Railway deployment config
├── vercel.json                 # Vercel deployment config
└── *.py                        # Database utility scripts (root)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.9
- Supabase CLI (for local database)
- Docker (for local Supabase)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `backend/.env` file with your database credentials (see [Configuration](#configuration)).

Run the API server:

```bash
uvicorn main:app --reload --port 8000
```

Precompute cached data:

```bash
python precompute.py              # Cache all periods
python precompute.py --period 7d  # Cache specific period
python precompute.py --list       # List cached endpoints
python precompute.py --clear      # Clear all cache
```

### Frontend Setup

```bash
cd dashboard-frontend
npm install
```

Create `dashboard-frontend/.env` with your Supabase credentials.

```bash
npm run dev       # Development server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Local Supabase

```bash
cd supabase
supabase start
```

This starts PostgreSQL (port 54322), API (port 54321), and Studio (port 54323).

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `postgres` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | — | Database password |
| `SUPABASE_URL` | `http://127.0.0.1:54321` | Supabase API URL |
| `SUPABASE_ANON_KEY` | — | Supabase anon key |
| `SUPABASE_SECRET_KEY` | — | Supabase service role key |
| `SUPABASE_JWKS_URL` | — | JWKS endpoint for auth verification |

### Frontend (`dashboard-frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

## Deployment

The backend is configured for **Railway** via `railway.json` (Nixpacks builder, uvicorn start command). The frontend is configured for **Vercel** via `vercel.json` (SPA rewrites).

## License

This project is for demonstration purposes.
