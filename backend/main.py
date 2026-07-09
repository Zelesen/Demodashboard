from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from datetime import datetime, timedelta, timezone
import os
import json
import jwt
from dotenv import load_dotenv
from pydantic import BaseModel
import httpx
import logging
import threading
from contextlib import contextmanager
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Dental Dashboard API")
security = HTTPBearer(auto_error=False)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "54322")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# JWT config
JWT_SECRET = os.getenv("JWT_SECRET", "brightsmiles-demo-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

db_pool = None
pool_lock = threading.Lock()
POOL_TIMEOUT = 30

def get_pool():
    global db_pool
    if db_pool is None:
        with pool_lock:
            if db_pool is None:
                db_pool = ThreadedConnectionPool(
                    minconn=1, maxconn=40,
                    host=DB_HOST, port=DB_PORT,
                    database=DB_NAME, user=DB_USER,
                    password=DB_PASSWORD
                )
    return db_pool

def get_db_connection():
    return get_pool().getconn()

def close_db_connection(conn):
    if conn:
        get_pool().putconn(conn)

@contextmanager
def db_connection():
    conn = get_pool().getconn()
    try:
        yield conn
    finally:
        get_pool().putconn(conn)

def ts(col):
    """Return column reference for timestamp (columns are now properly typed)"""
    return col

def dt(col):
    """Return column reference for date (columns are now properly typed)"""
    return col

def build_date_clause(period, start_date=None, end_date=None, column_expr="created_at"):
    """Returns (where_sql, params) for date filtering.
    If no filtering needed, returns ('TRUE', ()).
    All columns are text type, so we cast them to date/timestamp for comparison.
    """
    if start_date and end_date:
        return (
            f"{column_expr}::date >= %s AND {column_expr}::date < %s::date + INTERVAL '1 day'",
            (start_date, end_date)
        )
    period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": None}
    days = period_map.get(period, 7)
    if days:
        return (
            f"{column_expr}::date >= CURRENT_DATE - INTERVAL %s",
            (f"{days} days",)
        )
    return ("TRUE", ())


# --- JSON Cache Layer ---
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")

def get_cache(endpoint_name: str, period: str = None):
    """Read precomputed data from JSON cache. Returns None if not found."""
    filename = f"{endpoint_name}_{period}.json" if period else f"{endpoint_name}.json"
    path = os.path.join(CACHE_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return None

def cache_exists(endpoint_name: str, period: str = None):
    filename = f"{endpoint_name}_{period}.json" if period else f"{endpoint_name}.json"
    return os.path.exists(os.path.join(CACHE_DIR, filename))

def save_cache(endpoint_name: str, data, period: str = None):
    """Save data to JSON cache"""
    filename = f"{endpoint_name}_{period}.json" if period else f"{endpoint_name}.json"
    path = os.path.join(CACHE_DIR, filename)
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# --- Auth Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# --- Auth Helper ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_supabase_token(token: str) -> dict:
    """Verify Supabase JWT token and return user data"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY
                }
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "name": user_data.get("user_metadata", {}).get("name") or user_data.get("email", "").split("@")[0],
                    "role": user_data.get("user_metadata", {}).get("role", "user"),
                    "initials": (user_data.get("user_metadata", {}).get("name") or user_data.get("email", "").split("@")[0] or "U").split(" ")[0][0].upper()
                }
            else:
                raise HTTPException(status_code=401, detail="Invalid Supabase token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate JWT token, return user data"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        import asyncio
        try:
            user_data = asyncio.run(verify_supabase_token(token))
            return user_data
        except:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name"),
                "role": payload.get("role"),
                "initials": payload.get("initials", "AU")
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Auth Endpoints ---
@app.post("/api/auth/login")
def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            cursor.execute('SELECT * FROM "user" WHERE email = %s', (request.email,))
            user = cursor.fetchone()
        
            if not user:
                raise HTTPException(status_code=401, detail="Invalid email or password")
        
            db_password = user.get('password', '')
            if not db_password or request.password != db_password:
                raise HTTPException(status_code=401, detail="Invalid email or password")
        
            full_name = user['full_name'] if user['full_name'] else "Admin User"
            parts = full_name.split()
            initials = parts[0][0].upper() + parts[-1][0].upper() if len(parts) >= 2 else "AU"
        
            user_data = {
                "id": str(user['id']),
                "email": user['email'],
                "name": full_name,
                "role": user['role'],
                "initials": initials
            }
        
            access_token = create_access_token({
                "sub": str(user['id']),
                "email": user['email'],
                "name": full_name,
                "role": user['role'],
                "initials": initials
            })
        
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_data
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@app.get("/api/auth/user")
def get_user(current_user: dict = Depends(get_current_user)):
    """Alias for /api/auth/me to match frontend expectation"""
    return {"user": current_user}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Dental Dashboard API"}

@app.get("/api/dashboard/metrics")
def get_metrics(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get KPI metrics for the dashboard cards"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_metrics", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_prod, p_prod = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total_production 
                FROM dentally_invoices 
                WHERE {w_prod}
            """, p_prod)
            production_7d = cursor.fetchone()['total_production'] or 0

            w_appt, p_appt = build_date_clause(period, start_date, end_date, ts('start_time'))
            cursor.execute(f"""
                SELECT COUNT(*) as total_appointments,
                       SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed
                FROM dentally_appointments
                WHERE {w_appt}
            """, p_appt)
            appointment_stats = cursor.fetchone()
            nhs_delivery = (appointment_stats['completed'] / appointment_stats['total_appointments'] * 100) if appointment_stats['total_appointments'] > 0 else 0

            w_priv, p_priv = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as private_revenue
                FROM dentally_invoices
                WHERE {w_priv}
            """, p_priv)
            private_revenue = cursor.fetchone()['private_revenue'] or 0

            cursor.execute("""
                SELECT COUNT(*) as plan_members
                FROM dentally_payment_plans
                WHERE active = true
            """)
            plan_members = cursor.fetchone()['plan_members'] or 0

            w_pat, p_pat = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT COUNT(*) as new_patients
                FROM dentally_patients
                WHERE {w_pat}
            """, p_pat)
            new_patients = cursor.fetchone()['new_patients'] or 0

            w_cash, p_cash = build_date_clause(period, start_date, end_date, ts('dated_on'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as cash_position
                FROM dentally_payments
                WHERE {w_cash}
            """, p_cash)
            cash_position = cursor.fetchone()['cash_position'] or 0
        
            return {
                "group_production": {
                    "value": f"£{float(production_7d)/1000:.1f}k",
                    "change": "+10.1pp",
                    "footer": "107.6% to target",
                    "positive": True
                },
                "nhs_uda_delivery": {
                    "value": f"{nhs_delivery:.1f}%",
                    "change": "-0.2pp",
                    "footer": "glidepath 23%",
                    "positive": False
                },
                "private_plan_revenue": {
                    "value": f"£{float(private_revenue)/1000:.1f}k",
                    "change": "+5.8%",
                    "footer": "75.2% of income",
                    "positive": True
                },
                "plan_members": {
                    "value": f"+{plan_members}",
                    "change": "+3.7%",
                    "footer": f"{plan_members + 4800} active",
                    "positive": True
                },
                "new_patients": {
                    "value": str(new_patients),
                    "change": "-3.9%",
                    "footer": "53.3% to plan",
                    "positive": False
                },
                "group_cash_position": {
                    "value": f"£{float(cash_position)/1000:.1f}k",
                    "change": "+5.7%",
                    "footer": "vs prev 7 days",
                    "positive": True
                }
            }
    except Exception as e:
        logger.error(f"Error in metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/ai-insights")
def get_ai_insights(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get AI insights for the dashboard"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_ai_insights", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_ai, p_ai = build_date_clause(period, start_date, end_date, ts('a.start_time'))
            cursor.execute(f"""
                SELECT s.name as site_name,
                       COUNT(DISTINCT a.id) as total_appointments,
                       SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed_appointments
                FROM dentally_sites s
                LEFT JOIN dentally_appointments a ON s.dentally_id = a.site_id
                WHERE {w_ai}
                GROUP BY s.name
                ORDER BY completed_appointments ASC
                LIMIT 3
            """, p_ai)
            underperforming = cursor.fetchall()
        
            insights = []
            for site in underperforming:
                completion_rate = (site['completed_appointments'] / site['total_appointments'] * 100) if site['total_appointments'] > 0 else 0
                insights.append([
                    "ACT",
                    f"£{1000 + completion_rate * 10:.1f}k at stake",
                    f"{site['site_name']} is {100 - completion_rate:.1f}% behind target completion rate."
                ])
        
            return {"insights": insights[:3]}
    except Exception as e:
        logger.error(f"Error in ai-insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/health-score")
def get_health_score(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get health score and pillars"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_health_score", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_hp, p_hp = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total FROM dentally_invoices 
                WHERE {w_hp}
            """, p_hp)
            production = cursor.fetchone()['total'] or 0
            production_score = min(100, int(float(production) / 10000))

            w_ha, p_ha = build_date_clause(period, start_date, end_date, ts('start_time'))
            cursor.execute(f"""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed
                FROM dentally_appointments
                WHERE {w_ha}
            """, p_ha)
            appts = cursor.fetchone()
            nhs_score = int((appts['completed'] / appts['total'] * 100)) if appts['total'] > 0 else 0

            w_hpriv, p_hpriv = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total FROM dentally_invoices
                WHERE {w_hpriv}
            """, p_hpriv)
            private_total = cursor.fetchone()['total'] or 0
            private_score = min(100, int(float(private_total) / 15000))

            w_rec, p_rec = build_date_clause(period, start_date, end_date, ts('recall_date'))
            cursor.execute(f"""
                SELECT COUNT(*) as total FROM dentally_recalls
                WHERE {w_rec}
            """, p_rec)
            recalls = cursor.fetchone()['total'] or 0
            recall_score = min(100, int(recalls / 10))

            w_hpat, p_hpat = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT COUNT(*) as total FROM dentally_patients
                WHERE {w_hpat}
            """, p_hpat)
            new_patients = cursor.fetchone()['total'] or 0
            reputation_score = min(100, int(new_patients / 5))
        
            pillars = [production_score, nhs_score, private_score, recall_score, reputation_score]
            overall_score = int(sum(pillars) / len(pillars))
        
            return {
                "health_score": overall_score,
                "health_pillars": pillars
            }
    except Exception as e:
        logger.error(f"Error in health-score: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/nhs-chart")
def get_nhs_chart():
    """Get NHS UDA delivery chart data"""
    cached = get_cache("dashboard_nhs_chart")
    if cached:
        return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
            chart_data = []
        
            for i, month in enumerate(months):
                cursor.execute(f"""
                    SELECT COUNT(*) as delivered
                    FROM dentally_appointments
                    WHERE TO_CHAR({ts('start_time')}, 'MM') = %s
                    AND LOWER(status) = 'completed'
                """, (f"{i+1:02d}",))
            
                delivered = cursor.fetchone()['delivered'] or 0
                glidepath = 35 + (i * 7.5)
                projected = 65 if i >= 3 else None
            
                chart_data.append({
                    "month": month,
                    "delivered": delivered if delivered > 0 else None,
                    "glidepath": glidepath,
                    "projected": projected
                })
        
        
            return {"chart_data": chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/league")
def get_league(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get practice league table"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_league", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_league, p_league = build_date_clause(period, start_date, end_date, ts('a.start_time'))
            cursor.execute("SELECT id, name FROM dentally_sites WHERE active = 1")
            all_sites = {r['id']: r['name'] for r in cursor.fetchall()}

            cursor.execute(f"""
                SELECT s.id, s.name,
                       COUNT(DISTINCT a.id) as total_appointments,
                       SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed
                FROM dentally_sites s
                LEFT JOIN dentally_appointments a ON s.dentally_id = a.site_id AND {w_league}
                GROUP BY s.id, s.name
            """, p_league)
            appt_data = {r['id']: {'total': r['total_appointments'] or 0, 'completed': r['completed'] or 0} for r in cursor.fetchall()}

            cursor.execute("""
                SELECT s.id, s.name, COALESCE(SUM(i.amount), 0) as revenue
                FROM dentally_sites s
                LEFT JOIN dentally_invoices i ON s.dentally_id = i.site_id
                GROUP BY s.id, s.name
            """)
            inv_data = {r['id']: float(r['revenue'] or 0) for r in cursor.fetchall()}
        
            practices = []
            for sid, name in all_sites.items():
                appts = appt_data.get(sid, {})
                total_appts = appts.get('total', 0)
                completed = appts.get('completed', 0)
                revenue = inv_data.get(sid, 0)
                completion_rate = (completed / total_appts * 100) if total_appts > 0 else 0
                score = min(100, int(completion_rate + revenue / 1000))
            
                practices.append({
                    "name": name,
                    "revenue": f"£{revenue/1000:.1f}k",
                    "nhs": f"{completion_rate:.1f}% NHS",
                    "plan": "+0 plan",
                    "rating": "4.0",
                    "score": f"{score}%",
                    "status": "good" if score >= 80 else "warn" if score >= 60 else "bad",
                    "scoreVal": score
                })
            practices.sort(key=lambda x: x['scoreVal'], reverse=True)
        
            return {"practices": practices}
    except Exception as e:
        logger.error(f"Error in league: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/sites")
def get_sites():
    """Get all sites/practices for map"""
    cached = get_cache("dashboard_sites")
    if cached:
        return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            cursor.execute("""
                SELECT name, town, postcode, active
                FROM dentally_sites
                WHERE active = 1
            """)
        
            sites = []
            for row in cursor.fetchall():
                sites.append({
                    "name": row['name'],
                    "lat": 52.5,
                    "lng": -1.5,
                    "active": row['active']
                })
        
            return {"sites": sites}
    except Exception as e:
        logger.error(f"Error in sites: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/finance-metrics")
def get_finance_metrics(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get finance page KPI metrics"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_finance_metrics", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_fprod, p_fprod = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total FROM dentally_invoices 
                WHERE {w_fprod}
            """, p_fprod)
            production = cursor.fetchone()['total'] or 0

            w_fappt, p_fappt = build_date_clause(period, start_date, end_date, ts('start_time'))
            cursor.execute(f"""
                SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed
                FROM dentally_appointments
                WHERE {w_fappt}
            """, p_fappt)
            appts = cursor.fetchone()
            nhs_delivery = (appts['completed'] / appts['total'] * 100) if appts['total'] > 0 else 0

            w_fpriv, p_fpriv = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total FROM dentally_invoices
                WHERE {w_fpriv}
            """, p_fpriv)
            private_revenue = cursor.fetchone()['total'] or 0

            cursor.execute("SELECT COUNT(*) as total FROM dentally_payment_plans WHERE active = true")
            plan_members = cursor.fetchone()['total'] or 0

            w_fpat, p_fpat = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT COUNT(*) as total FROM dentally_patients
                WHERE {w_fpat}
            """, p_fpat)
            new_patients = cursor.fetchone()['total'] or 0

            w_fcash, p_fcash = build_date_clause(period, start_date, end_date, ts('dated_on'))
            cursor.execute(f"""
                SELECT SUM(amount::numeric) as total FROM dentally_payments
                WHERE {w_fcash}
            """, p_fcash)
            cash = cursor.fetchone()['total'] or 0
        
            return {
                "group_production": {"value": float(production), "positive": True},
                "nhs_delivery": {"value": nhs_delivery, "positive": nhs_delivery >= 100},
                "private_plan_revenue": {"value": float(private_revenue), "positive": True},
                "plan_members": {"value": plan_members, "positive": True},
                "new_patients": {"value": new_patients, "positive": True},
                "cash_position": {"value": float(cash), "positive": True}
            }
    except Exception as e:
        logger.error(f"Error in finance-metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/clinicians-league")
def get_clinicians_league(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get clinician league table data"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_clinicians_league", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_cl_appt, p_cl_appt = build_date_clause(period, start_date, end_date, ts('a.start_time'))
            w_cl_inv, p_cl_inv = build_date_clause(period, start_date, end_date, ts('i.created_at'))

            cursor.execute(f"""
                SELECT p.id, p.first_name || ' ' || p.last_name as name, p.role, s.name as practice,
                       COUNT(DISTINCT a.id) as sessions,
                       COALESCE(SUM(i.amount::numeric), 0) as production,
                       COALESCE(SUM(CASE WHEN a.did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END), 0) as fta_count
                FROM dentally_practitioners p
                LEFT JOIN dentally_sites s ON p.site_id = s.dentally_id
                LEFT JOIN dentally_appointments a ON p.dentally_id = a.practitioner_id 
                    AND {w_cl_appt}
                LEFT JOIN dentally_invoices i ON s.dentally_id = i.site_id OR s.id::text = i.site_id
                    AND {w_cl_inv}
                WHERE p.active = true
                GROUP BY p.id, p.first_name, p.last_name, p.role, s.name
                ORDER BY production DESC
                LIMIT 10
            """, (*p_cl_appt, *p_cl_inv))
        
            clinicians = []
            for idx, row in enumerate(cursor.fetchall(), 1):
                prod_per_sess = float(row['production']) / row['sessions'] if row['sessions'] > 0 else 0
                priv_mix = 75
                if float(row['production']) > 0:
                    priv_mix = min(100, max(0, 75 + (float(row['production']) % 20) - 10))
                recall = 80
                fta = (row['fta_count'] / row['sessions'] * 100) if row['sessions'] > 0 else 5
            
                clinicians.append({
                    "rank": idx,
                    "name": row['name'],
                    "role": row['role'],
                    "practice": row['practice'] or 'Unknown',
                    "sessions": row['sessions'],
                    "production": float(row['production']),
                    "prodPerSess": prod_per_sess,
                    "privMix": round(priv_mix, 0),
                    "recall": round(recall, 0),
                    "fta": round(fta, 0),
                    "compl": 5.0,
                    "index": 60 + idx
                })
        
            return {"clinicians": clinicians}
    except Exception as e:
        logger.error(f"Error in clinicians-league: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/operations-kpis")
def get_operations_kpis(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get operations page KPI metrics"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_operations_kpis", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_op_appt, p_op_appt = build_date_clause(period, start_date, end_date, ts('start_time'))
            w_op_pat, p_op_pat = build_date_clause(period, start_date, end_date, ts('created_at'))

            cursor.execute(f"""
                SELECT COUNT(*) as total_appointments, SUM(length_minutes) as total_minutes
                FROM dentally_appointments
                WHERE {w_op_appt}
                AND LOWER(status) != 'cancelled'
            """, p_op_appt)
            appt_stats = cursor.fetchone()
            avg_minutes = float(appt_stats['total_minutes'] or 0)
            total_booked = appt_stats['total_appointments'] or 0
            if start_date and end_date:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                end = datetime.strptime(end_date, "%Y-%m-%d")
                period_days = (end - start).days + 1
            else:
                period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": None}
                period_days = period_map.get(period, 7) or 365
            available_minutes = 8 * 8 * 60 * period_days
            utilisation = (avg_minutes / available_minutes * 100) if available_minutes > 0 else 0
        
            cursor.execute(f"""
                SELECT COUNT(*) as cancelled
                FROM dentally_appointments
                WHERE {w_op_appt}
                AND LOWER(status) = 'cancelled'
            """, p_op_appt)
            cancelled = cursor.fetchone()['cancelled'] or 0
            white_space = cancelled * 30
        
            cursor.execute(f"""
                SELECT COUNT(*) as delivered
                FROM dentally_appointments
                WHERE {w_op_appt}
                AND LOWER(status) = 'completed'
            """, p_op_appt)
            uda_delivered = cursor.fetchone()['delivered'] or 0
            uda_pace = (uda_delivered / max(period_days, 1) * 100 / 7) * 100 if period_days > 0 else 0
        
            cursor.execute("SELECT COUNT(*) as overdue FROM dentally_recalls WHERE recall_date < CURRENT_DATE")
            recalls_overdue = cursor.fetchone()['overdue'] or 0
        
            cursor.execute(f"""
                SELECT COUNT(*) as total, SUM(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta
                FROM dentally_appointments
                WHERE {w_op_appt}
            """, p_op_appt)
            fta_stats = cursor.fetchone()
            fta_rate = (fta_stats['fta'] / fta_stats['total'] * 100) if fta_stats['total'] > 0 else 0
        
            cursor.execute(f"""
                SELECT COUNT(*) as total
                FROM dentally_patients
                WHERE {w_op_pat}
            """, p_op_pat)
            new_patients = cursor.fetchone()['total'] or 0
            new_patient_rate = (new_patients / 50) * 100 if period_days <= 30 else (new_patients / max(period_days, 1) * 30) / 50 * 100
        
            return {
                "utilisation": round(utilisation, 1),
                "utilisationChange": -0.6,
                "whiteSpace": white_space,
                "whiteSpaceChange": 2.8,
                "udaPace": round(uda_pace, 1),
                "udaChange": 0.0,
                "recallsOverdue": recalls_overdue,
                "recallsChange": -27.6,
                "ftaShortNotice": round(fta_rate, 1),
                "ftaChange": -0.8,
                "newPatientRate": round(new_patient_rate, 1),
                "newPatientChange": 0.8
            }
    except Exception as e:
        logger.error(f"Error in operations-kpis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/practice-league")
def get_practice_league(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get practice utilisation league"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_practice_league", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_pl, p_pl = build_date_clause(period, start_date, end_date, ts('a.start_time'))
            cursor.execute(f"""
                SELECT s.name as practice, COUNT(DISTINCT a.id) as appointments,
                       SUM(a.length_minutes) as total_minutes
                FROM dentally_sites s
                LEFT JOIN dentally_appointments a ON s.id::text = a.site_id
                    AND {w_pl}
                    AND LOWER(a.status) != 'cancelled'
                WHERE s.active = 1
                GROUP BY s.id, s.name
                ORDER BY appointments DESC
            """, p_pl)
        
            practices = []
            for idx, row in enumerate(cursor.fetchall(), 1):
                utilisation = float(row['total_minutes'] or 0) / 3360 * 100
                practices.append({
                    "rank": idx,
                    "name": row['practice'],
                    "utilisation": round(utilisation, 1),
                    "appointments": row['appointments']
                })
        
            return {"practices": practices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/revenue-by-stream")
def get_revenue_by_stream(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get revenue by stream chart data"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_revenue_by_stream", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            if start_date and end_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                delta = (end_dt - start_dt).days
                date_points = []
                for i in range(delta + 1):
                    date = start_dt + timedelta(days=i)
                    date_points.append(date)
                period_type = "custom"
            else:
                period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": None}
                days = period_map.get(period, 7)
                if period == "today":
                    date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
                elif period in ["7d", "30d", "90d"]:
                    date_points = []
                    for i in range(days - 1, -1, -1):
                        date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                        date_points.append(date)
                else:
                    date_points = []
                    for i in range(11, -1, -1):
                        date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
                        date_points.append(date)
                period_type = period
        
            chart_data = []
            for date in date_points:
                date_str = date.strftime("%Y-%m-%d")
                date_label = date.strftime("%d %b") if period_type in ["today", "7d", "30d", "90d", "custom"] else date.strftime("%b %Y")
            
                cursor.execute(f"""
                    SELECT SUM(i.amount) as total_revenue
                    FROM dentally_invoices i
                    WHERE {dt('i.created_at')} = %s
                """, (date_str,))
            
                row = cursor.fetchone()
                chart_data.append({
                    "date": date_label,
                    "total": float(row['total_revenue'] or 0)
                })
        
            return {"chart_data": chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/profit-per-practice")
def get_profit_per_practice():
    """Get profit per practice scatter chart data"""
    cached = get_cache("dashboard_profit_per_practice")
    if cached:
        return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            cursor.execute(f"""
                SELECT s.name as practice, COALESCE(SUM(i.amount), 0) as revenue,
                       COUNT(DISTINCT a.id) as volume
                FROM dentally_sites s
                LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
                    AND {ts('i.created_at')} >= CURRENT_DATE - INTERVAL '30 days'
                LEFT JOIN dentally_appointments a ON s.id::text = a.site_id
                    AND {ts('a.start_time')} >= CURRENT_DATE - INTERVAL '30 days'
                    AND LOWER(a.status) = 'completed'
                WHERE s.active = 1
                GROUP BY s.id, s.name
            """)
        
            practices = []
            for row in cursor.fetchall():
                margin = min(40, max(10, (float(row['revenue']) / 1000) + 10))
                practices.append({
                    "name": row['practice'],
                    "revenue": float(row['revenue']),
                    "margin": round(margin, 1),
                    "volume": row['volume'],
                    "color": "#10b981" if margin >= 20 else "#f59e0b" if margin >= 15 else "#ef4444"
                })
        
            return {"practices": practices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/capacity-data")
def get_capacity_data():
    """Get capacity vs booked vs attended chart data"""
    cached = get_cache("dashboard_capacity_data")
    if cached:
        return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            days = []
            for i in range(6, -1, -1):
                date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                days.append({"date": date.strftime("%d %b"), "date_obj": date})
        
            chart_data = []
            for day in days:
                cursor.execute(f"""
                    SELECT COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END) as attended,
                           COUNT(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 END) as fta,
                           COUNT(CASE WHEN LOWER(status) = 'cancelled' THEN 1 END) as cancelled
                    FROM dentally_appointments
                    WHERE {dt('start_time')} = %s
                """, (day['date_obj'].strftime("%Y-%m-%d"),))
            
                row = cursor.fetchone()
                chart_data.append({
                    "day": day['date'],
                    "attended": row['attended'] or 0,
                    "fta": row['fta'] or 0,
                    "cancelled": row['cancelled'] or 0,
                    "capacity": 250
                })
        
            return {"chart_data": chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/recall-backlog")
def get_recall_backlog():
    """Get recall backlog data"""
    cached = get_cache("dashboard_recall_backlog")
    if cached:
        return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        
            cursor.execute(f"""
                SELECT COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as overdue_30,
                       COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '60 days' THEN 1 END) as overdue_60,
                       COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as overdue_90,
                       COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '180 days' THEN 1 END) as overdue_180
                FROM dentally_recalls
                WHERE {ts('recall_date')} < CURRENT_DATE
            """)
        
            row = cursor.fetchone()
        
            return {
                "recall_data": [
                    {"category": "30 days overdue", "count": row['overdue_30'] or 0, "percentage": 100},
                    {"category": "60 days overdue", "count": row['overdue_60'] or 0, "percentage": 71},
                    {"category": "90 days overdue", "count": row['overdue_90'] or 0, "percentage": 56},
                    {"category": "180+ days overdue", "count": row['overdue_180'] or 0, "percentage": 62},
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/case-acceptance")
def get_case_acceptance(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get case acceptance vs plan value data"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_case_acceptance", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_ca, p_ca = build_date_clause(period, start_date, end_date, ts('i.created_at'))
            cursor.execute(f"""
                SELECT p.role, AVG(i.amount) as avg_plan_value, COUNT(*) as case_count
                FROM dentally_practitioners p
                LEFT JOIN dentally_sites s ON p.site_id = s.id::text
                LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
                    AND {w_ca}
                WHERE p.active = true
                GROUP BY p.role
            """, p_ca)
        
            scatter_data = []
            for row in cursor.fetchall():
                base_x = float(row['avg_plan_value']) if row['avg_plan_value'] else 500
                base_y = 65 if row['role'] == 'Dentist' else 60
                for i in range(min(row['case_count'] or 5, 10)):
                    scatter_data.append({
                        "x": base_x + (i * 50) - 250,
                        "y": base_y + (i * 3) - 15,
                        "z": row['case_count'] or 5,
                        "role": row['role']
                    })
        
            return {"scatter_data": scatter_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/invoices-kpis")
def get_invoices_kpis(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get invoices page KPI metrics"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_invoices_kpis", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_ik, p_ik = build_date_clause(period, start_date, end_date, "created_at")
        
        # Total invoices
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
                    FROM dentally_invoices
                    WHERE {w_ik}
                """, p_ik)
                invoice_stats = cursor.fetchone()
                total_invoices = invoice_stats['total'] or 0
                total_amount = float(invoice_stats['total_amount'] or 0)
            except Exception as e:
                print(f"Error in total invoices query: {str(e)}")
                total_invoices = 0
                total_amount = 0
        
        # Outstanding amount
            try:
                cursor.execute(f"""
                    SELECT COALESCE(SUM(amount_outstanding), 0) as outstanding
                    FROM dentally_invoices
                    WHERE {w_ik}
                    AND amount_outstanding > 0
                """, p_ik)
                outstanding = float(cursor.fetchone()['outstanding'] or 0)
            except Exception as e:
                print(f"Error in outstanding query: {str(e)}")
                outstanding = 0
        
        # Paid invoices
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) as paid_count, COALESCE(SUM(amount), 0) as paid_amount
                    FROM dentally_invoices
                    WHERE {w_ik}
                    AND paid = true
                """, p_ik)
                paid_stats = cursor.fetchone()
                paid_count = paid_stats['paid_count'] or 0
                paid_amount = float(paid_stats['paid_amount'] or 0)
            except Exception as e:
                print(f"Error in paid invoices query: {str(e)}")
                paid_count = 0
                paid_amount = 0
        
        # Total revenue
            try:
                cursor.execute(f"""
                    SELECT COALESCE(SUM(amount), 0) as total_revenue
                    FROM dentally_invoices
                    WHERE {w_ik}
                """, p_ik)
                revenue_stats = cursor.fetchone()
                total_revenue = float(revenue_stats['total_revenue'] or 0)
            except Exception as e:
                print(f"Error in revenue query: {str(e)}")
                total_revenue = 0
        
        # Average invoice value
            avg_value = total_amount / total_invoices if total_invoices > 0 else 0
        
        # Collection rate
            collection_rate = ((total_amount - outstanding) / total_amount * 100) if total_amount > 0 else 0
        
        
            return {
                "totalInvoices": total_invoices,
                "totalRevenue": round(total_amount, 2),
                "outstanding": round(outstanding, 2),
                "paidInvoices": paid_count,
                "paidAmount": round(paid_amount, 2),
                "totalRevenue": round(total_revenue, 2),
                "avgInvoiceValue": round(avg_value, 2),
                "collectionRate": round(collection_rate, 1)
            }
    except Exception as e:
        print(f"Error in invoices-kpis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/invoices-trend")
def get_invoices_trend(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get invoice trend chart data"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_invoices_trend", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            if start_date and end_date:
                start_dt_trend = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt_trend = datetime.strptime(end_date, "%Y-%m-%d")
                delta = (end_dt_trend - start_dt_trend).days
                date_points = []
                for i in range(delta + 1):
                    date = start_dt_trend + timedelta(days=i)
                    date_points.append(date)
                period_type = "custom"
            else:
                period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": None}
                days = period_map.get(period, 30)
                if period == "today":
                    date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
                elif period in ["7d", "30d", "90d"]:
                    date_points = []
                    for i in range(days - 1, -1, -1):
                        date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                        date_points.append(date)
                else:
                    date_points = []
                    for i in range(11, -1, -1):
                        date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
                        date_points.append(date)
                period_type = period
        
            chart_data = []
            for date in date_points:
                date_str = date.strftime("%Y-%m-%d")
                date_label = date.strftime("%d %b") if period_type in ["today", "7d", "30d", "90d", "custom"] else date.strftime("%b %Y")
            
                try:
                    cursor.execute("""
                        SELECT COUNT(*) as count, 
                               COALESCE(SUM(amount), 0) as total,
                               COALESCE(SUM(CASE WHEN paid = true THEN amount ELSE 0 END), 0) as paid
                        FROM dentally_invoices
                        WHERE created_at::date = %s
                    """, (date_str,))
                
                    row = cursor.fetchone()
                    total = float(row['total'] or 0)
                    paid = float(row['paid'] or 0)
                
                    chart_data.append({
                        "date": date_label,
                        "count": row['count'] or 0,
                        "total": total,
                        "paid": paid,
                        "outstanding": total - paid
                    })
                except Exception as e:
                    print(f"Error processing date {date_str}: {str(e)}")
                    chart_data.append({
                        "date": date_label,
                        "count": 0,
                        "total": 0,
                        "paid": 0,
                        "outstanding": 0
                    })
        
            return {"chart_data": chart_data}
    except Exception as e:
        print(f"Error in invoices-trend: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/invoices-kpis-datedon")
def get_invoices_kpis_datedon(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get invoices page KPI metrics using dated_on instead of created_at"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_invoices_kpis_datedon", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_ikd, p_ikd = build_date_clause(period, start_date, end_date, "dated_on")
        
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
                    FROM dentally_invoices
                    WHERE {w_ikd}
                """, p_ikd)
                invoice_stats = cursor.fetchone()
                total_invoices = invoice_stats['total'] or 0
                total_amount = float(invoice_stats['total_amount'] or 0)
            except Exception as e:
                print(f"Error in datedon invoices query: {str(e)}")
                total_invoices = 0
                total_amount = 0
        
            try:
                cursor.execute(f"""
                    SELECT COALESCE(SUM(amount_outstanding), 0) as outstanding
                    FROM dentally_invoices
                    WHERE {w_ikd}
                    AND amount_outstanding > 0
                """, p_ikd)
                outstanding = float(cursor.fetchone()['outstanding'] or 0)
            except Exception as e:
                print(f"Error in datedon outstanding query: {str(e)}")
                outstanding = 0
        
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) as paid_count, COALESCE(SUM(amount), 0) as paid_amount
                    FROM dentally_invoices
                    WHERE {w_ikd}
                    AND paid = true
                """, p_ikd)
                paid_stats = cursor.fetchone()
                paid_count = paid_stats['paid_count'] or 0
                paid_amount = float(paid_stats['paid_amount'] or 0)
            except Exception as e:
                print(f"Error in datedon paid query: {str(e)}")
                paid_count = 0
                paid_amount = 0
        
            try:
                cursor.execute(f"""
                    SELECT COALESCE(SUM(amount), 0) as total_revenue
                    FROM dentally_invoices
                    WHERE {w_ikd}
                """, p_ikd)
                revenue_stats = cursor.fetchone()
                total_revenue = float(revenue_stats['total_revenue'] or 0)
            except Exception as e:
                print(f"Error in datedon revenue query: {str(e)}")
                total_revenue = 0
        
            avg_value = total_amount / total_invoices if total_invoices > 0 else 0
            collection_rate = ((total_amount - outstanding) / total_amount * 100) if total_amount > 0 else 0
        
        
            return {
                "totalInvoices": total_invoices,
                "totalRevenue": round(total_amount, 2),
                "outstanding": round(outstanding, 2),
                "paidInvoices": paid_count,
                "paidAmount": round(paid_amount, 2),
                "totalRevenue": round(total_revenue, 2),
                "avgInvoiceValue": round(avg_value, 2),
                "collectionRate": round(collection_rate, 1)
            }
    except Exception as e:
        print(f"Error in invoices-kpis-datedon: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/invoices/revenue-by-treatment")
def get_revenue_by_treatment(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get revenue grouped by treatment type from invoice items"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_revenue_by_treatment", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_rt, p_rt = build_date_clause(period, start_date, end_date, ts('i.created_at'))
            cursor.execute(f"""
                SELECT 
                    COALESCE(ii.nomenclature, 'Unknown Treatment') as treatment_name,
                    COUNT(DISTINCT ii.id) as treatment_count,
                    COALESCE(SUM(ii.price::numeric), 0) as total_revenue,
                    COALESCE(AVG(ii.price::numeric), 0) as avg_price
                FROM dentally_invoice_items ii
                LEFT JOIN dentally_invoices i ON ii.invoice_id = i.id
                WHERE {w_rt}
                AND ii.nomenclature IS NOT NULL
                AND ii.nomenclature != ''
                GROUP BY ii.nomenclature
                ORDER BY total_revenue DESC
                LIMIT 15
            """, p_rt)
        
            treatments = []
            for row in cursor.fetchall():
                treatments.append({
                    "treatmentName": row['treatment_name'],
                    "treatmentCount": row['treatment_count'] or 0,
                    "totalRevenue": float(row['total_revenue'] or 0),
                    "avgPrice": float(row['avg_price'] or 0)
                })
        
        
            result = {"treatments": treatments}
        
            if not start_date and not end_date:
                save_cache("dashboard_revenue_by_treatment", result, period)
        
            return result
    except Exception as e:
        print(f"Error in revenue-by-treatment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/invoices/top-patients-by-revenue")
def get_top_patients_by_revenue(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get top patients by revenue"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_top_patients_by_revenue", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tp, p_tp = build_date_clause(period, start_date, end_date, ts('i.created_at'))
            cursor.execute(f"""
                SELECT 
                    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Patient') as patient_name,
                    p.dentally_id as patient_id,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COALESCE(SUM(i.amount::numeric), 0) as total_revenue,
                    COALESCE(SUM(i.amount_outstanding::numeric), 0) as outstanding,
                    MAX(i.created_at) as last_invoice_date
                FROM dentally_patients p
                LEFT JOIN dentally_invoices i ON p.dentally_id = i.patient_id
                WHERE {w_tp}
                AND p.dentally_id IS NOT NULL
                GROUP BY p.dentally_id, p.first_name, p.last_name
                HAVING COUNT(DISTINCT i.id) > 0
                ORDER BY total_revenue DESC
                LIMIT 20
            """, p_tp)
        
            patients = []
            for row in cursor.fetchall():
                patients.append({
                    "patientName": row['patient_name'],
                    "patientId": row['patient_id'],
                    "invoiceCount": row['invoice_count'] or 0,
                    "totalRevenue": float(row['total_revenue'] or 0),
                    "outstanding": float(row['outstanding'] or 0),
                    "lastInvoiceDate": row['last_invoice_date'].isoformat() if row['last_invoice_date'] else None
                })
        
        
            result = {"patients": patients}
        
            if not start_date and not end_date:
                save_cache("dashboard_top_patients_by_revenue", result, period)
        
            return result
    except Exception as e:
        print(f"Error in top-patients-by-revenue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/revenue-by-site")
def get_revenue_by_site(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get revenue grouped by site/practice"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_revenue_by_site", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_rs, p_rs = build_date_clause(period, start_date, end_date, ts('i.created_at'))
            cursor.execute(f"""
                SELECT 
                    s.name as site_name,
                    s.town as site_location,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COALESCE(SUM(i.amount::numeric), 0) as total_revenue,
                    COALESCE(SUM(i.amount_outstanding::numeric), 0) as outstanding,
                    COALESCE(SUM(CASE WHEN i.paid = true THEN i.amount::numeric ELSE 0 END), 0) as paid_amount,
                    COUNT(DISTINCT ii.id) as treatment_items_count
                FROM dentally_sites s
                LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
                LEFT JOIN dentally_invoice_items ii ON i.id = ii.invoice_id
                WHERE {w_rs}
                AND s.active = 1
                GROUP BY s.id, s.name, s.town
                ORDER BY total_revenue DESC
            """, p_rs)
        
            sites = []
            for row in cursor.fetchall():
                total_rev = float(row['total_revenue'] or 0)
                paid = float(row['paid_amount'] or 0)
                collection_rate = (paid / total_rev * 100) if total_rev > 0 else 0
            
                sites.append({
                    "siteName": row['site_name'],
                    "siteLocation": row['site_location'] or 'Unknown',
                    "invoiceCount": row['invoice_count'] or 0,
                    "totalRevenue": total_rev,
                    "outstanding": float(row['outstanding'] or 0),
                    "paidAmount": paid,
                    "collectionRate": round(collection_rate, 1),
                    "treatmentItemsCount": row['treatment_items_count'] or 0
                })
        
        
            result = {"sites": sites}
        
            if not start_date and not end_date:
                save_cache("dashboard_revenue_by_site", result, period)
        
            return result
    except Exception as e:
        print(f"Error in revenue-by-site: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/invoices-trend-datedon")
def get_invoices_trend_datedon(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get invoice trend chart data using dated_on instead of created_at"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_invoices_trend_datedon", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            if start_date and end_date:
                start_dt_trend = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt_trend = datetime.strptime(end_date, "%Y-%m-%d")
                delta = (end_dt_trend - start_dt_trend).days
                date_points = []
                for i in range(delta + 1):
                    date = start_dt_trend + timedelta(days=i)
                    date_points.append(date)
                period_type = "custom"
            else:
                period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": None}
                days = period_map.get(period, 30)
                if period == "today":
                    date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
                elif period in ["7d", "30d", "90d"]:
                    date_points = []
                    for i in range(days - 1, -1, -1):
                        date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                        date_points.append(date)
                else:
                    date_points = []
                    for i in range(11, -1, -1):
                        date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
                        date_points.append(date)
                period_type = period
        
            chart_data = []
            for date in date_points:
                date_str = date.strftime("%Y-%m-%d")
                date_label = date.strftime("%d %b") if period_type in ["today", "7d", "30d", "90d", "custom"] else date.strftime("%b %Y")
            
                try:
                    cursor.execute("""
                        SELECT COUNT(*) as count, 
                               COALESCE(SUM(amount), 0) as total,
                               COALESCE(SUM(CASE WHEN paid = true THEN amount ELSE 0 END), 0) as paid
                        FROM dentally_invoices
                        WHERE dated_on::date = %s
                    """, (date_str,))
                
                    row = cursor.fetchone()
                    total = float(row['total'] or 0)
                    paid = float(row['paid'] or 0)
                
                    chart_data.append({
                        "date": date_label,
                        "count": row['count'] or 0,
                        "total": total,
                        "paid": paid,
                        "outstanding": total - paid
                    })
                except Exception as e:
                    print(f"Error processing date {date_str}: {str(e)}")
                    chart_data.append({
                        "date": date_label,
                        "count": 0,
                        "total": 0,
                        "paid": 0,
                        "outstanding": 0
                    })
        
        
            result = {"chart_data": chart_data}
        
            if not start_date and not end_date:
                save_cache("dashboard_invoices_trend_datedon", result, period)
        
            return result
    except Exception as e:
        print(f"Error in invoices-trend-datedon: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/invoices/top-patients-by-revenue-datedon")
def get_top_patients_by_revenue_datedon(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get top patients by revenue using dated_on instead of created_at"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_top_patients_by_revenue_datedon", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tp, p_tp = build_date_clause(period, start_date, end_date, "dated_on")
            cursor.execute(f"""
                SELECT 
                    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Patient') as patient_name,
                    p.dentally_id as patient_id,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COALESCE(SUM(i.amount::numeric), 0) as total_revenue,
                    COALESCE(SUM(i.amount_outstanding::numeric), 0) as outstanding,
                    MAX(i.dated_on) as last_invoice_date
                FROM dentally_patients p
                LEFT JOIN dentally_invoices i ON p.dentally_id = i.patient_id
                WHERE {w_tp}
                AND p.dentally_id IS NOT NULL
                GROUP BY p.dentally_id, p.first_name, p.last_name
                HAVING COUNT(DISTINCT i.id) > 0
                ORDER BY total_revenue DESC
                LIMIT 20
            """, p_tp)
        
            patients = []
            for row in cursor.fetchall():
                patients.append({
                    "patientName": row['patient_name'],
                    "patientId": row['patient_id'],
                    "invoiceCount": row['invoice_count'] or 0,
                    "totalRevenue": float(row['total_revenue'] or 0),
                    "outstanding": float(row['outstanding'] or 0),
                    "lastInvoiceDate": row['last_invoice_date'].isoformat() if row['last_invoice_date'] else None
                })
        
        
            result = {"patients": patients}
        
            if not start_date and not end_date:
                save_cache("dashboard_top_patients_by_revenue_datedon", result, period)
        
            return result
    except Exception as e:
        print(f"Error in top-patients-by-revenue-datedon: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/revenue-by-site-datedon")
def get_revenue_by_site_datedon(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get revenue grouped by site/practice using dated_on instead of created_at"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_revenue_by_site_datedon", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_rs, p_rs = build_date_clause(period, start_date, end_date, "dated_on")
            cursor.execute(f"""
                SELECT 
                    s.name as site_name,
                    s.town as site_location,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COALESCE(SUM(i.amount::numeric), 0) as total_revenue,
                    COALESCE(SUM(i.amount_outstanding::numeric), 0) as outstanding,
                    COALESCE(SUM(CASE WHEN i.paid = true THEN i.amount::numeric ELSE 0 END), 0) as paid_amount,
                    COUNT(DISTINCT ii.id) as treatment_items_count
                FROM dentally_sites s
                LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
                LEFT JOIN dentally_invoice_items ii ON i.id = ii.invoice_id
                WHERE {w_rs}
                AND s.active = 1
                GROUP BY s.id, s.name, s.town
                ORDER BY total_revenue DESC
            """, p_rs)
        
            sites = []
            for row in cursor.fetchall():
                total_rev = float(row['total_revenue'] or 0)
                paid = float(row['paid_amount'] or 0)
                collection_rate = (paid / total_rev * 100) if total_rev > 0 else 0
            
                sites.append({
                    "siteName": row['site_name'],
                    "siteLocation": row['site_location'] or 'Unknown',
                    "invoiceCount": row['invoice_count'] or 0,
                    "totalRevenue": total_rev,
                    "outstanding": float(row['outstanding'] or 0),
                    "paidAmount": paid,
                    "collectionRate": round(collection_rate, 1),
                    "treatmentItemsCount": row['treatment_items_count'] or 0
                })
        
        
            result = {"sites": sites}
        
            if not start_date and not end_date:
                save_cache("dashboard_revenue_by_site_datedon", result, period)
        
            return result
    except Exception as e:
        print(f"Error in revenue-by-site-datedon: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TREATMENT PLAN ENDPOINTS ====================

@app.get("/api/dashboard/treatment-plan-kpis")
def get_treatment_plan_kpis(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get treatment plan KPIs - mirrors Dentally Treatment Plans API pattern"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_kpis", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tp, p_tp = build_date_clause(period, start_date, end_date, ts('created_at'))
            cursor.execute(f"""
                SELECT COUNT(*) as total_plans, 
                       SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_plans,
                       SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_plans,
                       SUM(CASE WHEN LOWER(status) = 'proposed' THEN 1 ELSE 0 END) as proposed_plans,
                       COALESCE(SUM(nhs_uda_value), 0) as total_nhs_uda_value,
                       COALESCE(SUM(nhs_completed_uda_value), 0) as completed_nhs_uda_value,
                       COALESCE(SUM(private_treatment_value), 0) as total_private_value
                FROM dentally_treatment_plans
                WHERE {w_tp}
            """, p_tp)
            stats = cursor.fetchone()
        
            w_ai, p_ai = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"SELECT COALESCE(AVG(price), 0) as avg_item_price FROM dentally_treatment_plan_items WHERE {w_ai}", p_ai)
            avg_item = cursor.fetchone()
        
            total = stats["total_plans"] or 0
            completed = stats["completed_plans"] or 0
            completion_rate = int((completed / total * 100)) if total > 0 else 0
        
            result = {
                "totalPlans": total,
                "completedPlans": completed,
                "activePlans": stats["active_plans"] or 0,
                "proposedPlans": stats["proposed_plans"] or 0,
                "completionRate": completion_rate,
                "totalNhsUdaValue": float(stats["total_nhs_uda_value"] or 0),
                "completedNhsUdaValue": float(stats["completed_nhs_uda_value"] or 0),
                "totalPrivateValue": float(stats["total_private_value"] or 0),
                "avgItemPrice": float(avg_item["avg_item_price"] or 0)
            }
        
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_kpis", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-kpis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plans-by-practitioner")
def get_treatment_plans_by_practitioner(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get treatment plans grouped by practitioner"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plans_by_practitioner", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tpp, p_tpp = build_date_clause(period, column_expr=ts("tp.created_at"))
            cursor.execute(f"""
                SELECT p.dentally_id as practitioner_id, 
                       COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as practitioner_name, 
                       p.role, 
                       COUNT(DISTINCT tp.id) as total_plans, 
                       COUNT(DISTINCT CASE WHEN tp.completed = true THEN tp.id END) as completed_plans,
                       COALESCE(SUM(tp.nhs_uda_value), 0) as nhs_uda_value,
                       COALESCE(SUM(tp.private_treatment_value), 0) as private_value,
                       COALESCE(SUM(tpi.price), 0) as items_value
                FROM dentally_practitioners p
                LEFT JOIN dentally_treatment_plans tp ON tp.practitioner_id = p.dentally_id AND tp.id IS NOT NULL AND {w_tpp}
                LEFT JOIN dentally_treatment_plan_items tpi ON tpi.treatment_plan_id = tp.dentally_id
                WHERE p.active = true
                GROUP BY p.dentally_id, p.first_name, p.last_name, p.role
                ORDER BY total_plans DESC
                LIMIT 15
            """, p_tpp)
        
            practitioners = []
            for row in cursor.fetchall():
                total = row['total_plans'] or 0
                completed = row['completed_plans'] or 0
                completion_rate = int((completed / total * 100)) if total > 0 else 0
            
                practitioners.append({
                    "practitionerId": row['practitioner_id'],
                    "practitionerName": row['practitioner_name'],
                    "role": row['role'],
                    "totalPlans": total,
                    "completedPlans": completed,
                    "completionRate": completion_rate,
                    "nhsValue": float(row['nhs_uda_value'] or 0),
                    "privateValue": float(row['private_value'] or 0)
                })
        
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plans_by_practitioner", {"practitioners": practitioners}, period)
        
            return {"practitioners": practitioners}
    except Exception as e:
        print(f"Error in treatment-plans-by-practitioner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-items")
def get_treatment_plan_items(limit: int = 20, period: str = "7d", start_date: str = None, end_date: str = None):
    """Get recent treatment plan items with details"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_items", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tpi, p_tpi = build_date_clause(period, column_expr=ts("tpi.created_at"))
            cursor.execute(f"""
                SELECT tpi.id, tpi.nomenclature, tpi.price as price, 
                       COALESCE(tpi.completed = true, false) as completed, 
                       tpi.completed_at as completed_at, 
                       tpi.created_at as created_at, 
                       tpi.duration as duration, 
                       tpi.uda_band, 
                       COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as patient_name, 
                       COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown') as practitioner_name, 
                       tp.status as plan_status, 
                       tp.dentally_id as plan_ref
                FROM dentally_treatment_plan_items tpi
                LEFT JOIN dentally_patients p ON p.dentally_id = NULLIF(tpi.patient_id, '')
                LEFT JOIN dentally_practitioners pr ON pr.dentally_id = NULLIF(tpi.practitioner_id, '')
                LEFT JOIN dentally_treatment_plans tp ON tp.dentally_id = tpi.treatment_plan_id
                WHERE {w_tpi}
                ORDER BY tpi.created_at DESC NULLS LAST
                LIMIT %s
            """, (*p_tpi, limit))
        
            items = []
            for row in cursor.fetchall():
                items.append({
                    "id": row['id'],
                    "nomenclature": row['nomenclature'],
                    "price": float(row['price'] or 0),
                    "completed": row['completed'],
                    "completedAt": row['completed_at'].isoformat() if row['completed_at'] else None,
                    "createdAt": row['created_at'].isoformat() if row['created_at'] else None,
                    "duration": float(row['duration'] or 0),
                    "udaBand": row['uda_band'],
                    "patientName": row['patient_name'],
                    "practitionerName": row['practitioner_name'],
                    "planStatus": row['plan_status'],
                    "planRef": row['plan_ref']
                })
        
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_items", {"items": items}, period)
        
            return {"items": items}
    except Exception as e:
        print(f"Error in treatment-plan-items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plans-by-treatment")
def get_treatment_plans_by_treatment(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get count of treatment plan items grouped by treatment type (nomenclature)"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plans_by_treatment", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_bt, p_bt = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"""
                SELECT nomenclature as treatment_name, COUNT(*) as count
                FROM dentally_treatment_plan_items
                WHERE {w_bt}
                GROUP BY nomenclature
                ORDER BY count DESC
                LIMIT 10
            """, p_bt)
        
            treatments = [{"name": r["treatment_name"], "count": r["count"]} for r in cursor.fetchall()]
        
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plans_by_treatment", {"treatments": treatments}, period)
        
            return {"treatments": treatments}
    except Exception as e:
        print(f"Error in treatment-plans-by-treatment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-trends")
def get_treatment_plan_trends(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get treatment plan creation trends over time"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_trends", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tp, p_tp = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"""
                SELECT TO_CHAR(created_at::date, 'YYYY-MM') as month, 
                       COUNT(*) as plans_created, 
                       SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as plans_completed,
                       COALESCE(SUM(nhs_uda_value), 0) as nhs_value,
                       COALESCE(SUM(private_treatment_value), 0) as private_value
                FROM dentally_treatment_plans
                WHERE {w_tp}
                GROUP BY TO_CHAR(created_at::date, 'YYYY-MM')
                ORDER BY month ASC
            """, p_tp)
        
            trends = [{"month": r["month"], "plansCreated": r["plans_created"], "plansCompleted": r["plans_completed"], 
                       "nhsValue": float(r["nhs_value"] or 0), "privateValue": float(r["private_value"] or 0)} 
                      for r in cursor.fetchall()]
        
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_trends", {"trends": trends}, period)
        
            return {"trends": trends}
    except Exception as e:
        print(f"Error in treatment-plan-trends: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NEW CREATIVE CHART ENDPOINTS ====================

@app.get("/api/dashboard/treatment-plan-duration")
def get_treatment_plan_duration(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get average treatment plan duration (days from start to completion)"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_duration", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_td, p_td = build_date_clause(period, column_expr=ts("completed_at"))
            cursor.execute(f"""
                SELECT 
                    AVG(EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400) as avg_days,
                    MIN(EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400) as min_days,
                    MAX(EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400) as max_days,
                    COUNT(*) as completed_count
                FROM dentally_treatment_plans
                WHERE {w_td}
                AND completed = true
                AND completed_at IS NOT NULL
                AND start_date IS NOT NULL
            """, p_td)
        
            result = cursor.fetchone()
        
            data = {
                "avgDays": round(float(result['avg_days'] or 0), 1),
                "minDays": round(float(result['min_days'] or 0), 1),
                "maxDays": round(float(result['max_days'] or 0), 1),
                "completedCount": result['completed_count'] or 0
            }
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_duration", data, period)
        
            return data
    except Exception as e:
        print(f"Error in treatment-plan-duration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-patients")
def get_treatment_plan_patients(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get unique patients with treatment plans"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_patients", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tpp, p_tpp = build_date_clause(period, column_expr=ts("created_at"))
        
        # Total unique patients
            cursor.execute(f"""
                SELECT COUNT(DISTINCT patient_id) as unique_patients,
                       COUNT(*) as total_plans,
                       AVG(nhs_uda_value + private_treatment_value) as avg_plan_value
                FROM dentally_treatment_plans
                WHERE {w_tpp}
                AND NULLIF(patient_id, '') IS NOT NULL
            """, p_tpp)
        
            stats = cursor.fetchone()
        
        # Patients with multiple plans
            cursor.execute(f"""
                SELECT patient_id, COUNT(*) as plan_count
                FROM dentally_treatment_plans
                WHERE {w_tpp}
                AND NULLIF(patient_id, '') IS NOT NULL
                GROUP BY patient_id
                HAVING COUNT(*) > 1
                ORDER BY plan_count DESC
                LIMIT 10
            """, p_tpp)
        
            multi_plan_patients = [{"patientId": r['patient_id'], "planCount": r['plan_count']} 
                                  for r in cursor.fetchall()]
        
        
            data = {
                "uniquePatients": stats['unique_patients'] or 0,
                "totalPlans": stats['total_plans'] or 0,
                "avgPlanValue": float(stats['avg_plan_value'] or 0),
                "plansPerPatient": round((stats['total_plans'] or 0) / (stats['unique_patients'] or 1), 1),
                "multiPlanPatients": len(multi_plan_patients),
                "topMultiPlan": multi_plan_patients[:5]
            }
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_patients", data, period)
        
            return data
    except Exception as e:
        print(f"Error in treatment-plan-patients: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-velocity")
def get_treatment_plan_velocity(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get plan completion velocity - how quickly plans are completed after creation"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_velocity", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tv, p_tv = build_date_clause(period, column_expr=ts("completed_at"))
            cursor.execute(f"""
                SELECT 
                    EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400 as days_to_complete,
                    EXTRACT(MONTH FROM completed_at) as completion_month,
                    COUNT(*) as count
                FROM dentally_treatment_plans
                WHERE {w_tv}
                AND completed = true
                AND completed_at IS NOT NULL
                AND created_at IS NOT NULL
                GROUP BY 
                    EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400,
                    EXTRACT(MONTH FROM completed_at)
                ORDER BY completion_month
            """, p_tv)
        
            rows = cursor.fetchall()
        
        # Group by month
            monthly_data = {}
            for row in rows:
                month = int(row['completion_month'])
                days = round(float(row['days_to_complete'] or 0), 1)
                count = row['count'] or 0
            
                if month not in monthly_data:
                    monthly_data[month] = {"totalDays": 0, "count": 0}
            
                monthly_data[month]["totalDays"] += days * count
                monthly_data[month]["count"] += count
        
        # Calculate averages
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            velocity_data = []
        
            for month_num in sorted(monthly_data.keys()):
                data = monthly_data[month_num]
                avg_days = round(data["totalDays"] / data["count"], 1) if data["count"] > 0 else 0
                velocity_data.append({
                    "month": months[month_num - 1],
                    "avgDays": avg_days,
                    "count": data["count"]
                })
        
        
            result = {"velocity": velocity_data}
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_velocity", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-velocity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-value-distribution")
def get_treatment_plan_value_distribution(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get distribution of treatment plan values"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_value_distribution", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tvd, p_tvd = build_date_clause(period, column_expr=ts("created_at"))
        
        # Calculate total value for each plan
            cursor.execute(f"""
                SELECT 
                    COALESCE(nhs_uda_value, 0) + COALESCE(private_treatment_value, 0) as total_value,
                    CASE 
                        WHEN COALESCE(nhs_uda_value, 0) + COALESCE(private_treatment_value, 0) < 100 THEN '£0-100'
                        WHEN COALESCE(nhs_uda_value, 0) + COALESCE(private_treatment_value, 0) < 300 THEN '£100-300'
                        WHEN COALESCE(nhs_uda_value, 0) + COALESCE(private_treatment_value, 0) < 500 THEN '£300-500'
                        WHEN COALESCE(nhs_uda_value, 0) + COALESCE(private_treatment_value, 0) < 1000 THEN '£500-1000'
                        ELSE '£1000+'
                    END as value_range
                FROM dentally_treatment_plans
                WHERE {w_tvd}
            """, p_tvd)
        
            rows = cursor.fetchall()
        
        # Count by range
            distribution = {
                "£0-100": 0,
                "£100-300": 0,
                "£300-500": 0,
                "£500-1000": 0,
                "£1000+": 0
            }
        
            for row in rows:
                value_range = row['value_range']
                if value_range in distribution:
                    distribution[value_range] += 1
        
        
            result = {"distribution": [{"range": k, "count": v} for k, v in distribution.items()]}
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_value_distribution", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-value-distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-completion-heatmap")
def get_treatment_plan_completion_heatmap(period: str = "90d", start_date: str = None, end_date: str = None):
    """Get completion heatmap by day of week and hour"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_completion_heatmap", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_th, p_th = build_date_clause(period, column_expr=ts("completed_at"))
            cursor.execute(f"""
                SELECT 
                    EXTRACT(DOW FROM completed_at) as day_of_week,
                    EXTRACT(HOUR FROM completed_at) as hour_of_day,
                    COUNT(*) as completion_count
                FROM dentally_treatment_plans
                WHERE {w_th}
                AND completed = true
                AND completed_at IS NOT NULL
                GROUP BY 
                    EXTRACT(DOW FROM completed_at),
                    EXTRACT(HOUR FROM completed_at)
                ORDER BY day_of_week, hour_of_day
            """, p_th)
        
            rows = cursor.fetchall()
        
        # Build heatmap data
            days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            heatmap = []
        
            for row in rows:
                heatmap.append({
                    "day": days[int(row['day_of_week'])],
                    "hour": int(row['hour_of_day']),
                    "value": row['completion_count'] or 0
                })
        
        
            result = {"heatmap": heatmap}
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_completion_heatmap", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-completion-heatmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-nhs-vs-private")
def get_treatment_plan_nhs_vs_private(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get NHS vs Private value breakdown by practitioner"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_nhs_vs_private", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_np, p_np = build_date_clause(period, column_expr=ts("tp.created_at"))
            cursor.execute(f"""
                SELECT 
                    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as practitioner_name,
                    COALESCE(SUM(tp.nhs_uda_value), 0) as nhs_value,
                    COALESCE(SUM(tp.private_treatment_value), 0) as private_value,
                    COUNT(DISTINCT tp.id) as plan_count
                FROM dentally_practitioners p
                LEFT JOIN dentally_treatment_plans tp ON tp.practitioner_id = p.dentally_id AND tp.id IS NOT NULL AND {w_np}
                WHERE p.active = true
                GROUP BY p.id, p.first_name, p.last_name
                HAVING COUNT(DISTINCT tp.id) > 0
                ORDER BY (COALESCE(SUM(tp.nhs_uda_value), 0) + COALESCE(SUM(tp.private_treatment_value), 0)) DESC
                LIMIT 10
            """, p_np)
        
            practitioners = []
            for row in cursor.fetchall():
                total = float(row['nhs_value'] or 0) + float(row['private_value'] or 0)
                nhs_pct = (float(row['nhs_value'] or 0) / total * 100) if total > 0 else 0
                private_pct = (float(row['private_value'] or 0) / total * 100) if total > 0 else 0
            
                practitioners.append({
                    "name": row['practitioner_name'],
                    "nhsValue": float(row['nhs_value'] or 0),
                    "privateValue": float(row['private_value'] or 0),
                    "nhsPercentage": round(nhs_pct, 1),
                    "privatePercentage": round(private_pct, 1),
                    "planCount": row['plan_count'] or 0
                })
        
        
            result = {"practitioners": practitioners}
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_nhs_vs_private", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-nhs-vs-private: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-funnel")
def get_treatment_plan_funnel(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get treatment plan conversion funnel"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_funnel", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            w_tf, p_tf = build_date_clause(period, column_expr=ts("created_at"))
        
        # Total plans created
            cursor.execute(f"""
                SELECT COUNT(*) as total
                FROM dentally_treatment_plans
                WHERE {w_tf}
            """, p_tf)
            total_created = cursor.fetchone()['total'] or 0
        
        # Plans started (active or completed)
            cursor.execute(f"""
                SELECT COUNT(*) as started
                FROM dentally_treatment_plans
                WHERE {w_tf}
                AND LOWER(status) IN ('active', 'completed')
            """, p_tf)
            started = cursor.fetchone()['started'] or 0
        
        # Plans completed
            cursor.execute(f"""
                SELECT COUNT(*) as completed
                FROM dentally_treatment_plans
                WHERE {w_tf}
                AND completed = true
            """, p_tf)
            completed = cursor.fetchone()['completed'] or 0
        
        # Plans with NHS UDA delivered
            cursor.execute(f"""
                SELECT COUNT(*) as nhs_delivered
                FROM dentally_treatment_plans
                WHERE {w_tf}
                AND nhs_completed_uda_value > 0
            """, p_tf)
            nhs_delivered = cursor.fetchone()['nhs_delivered'] or 0
        
        
            funnel = [
                {"stage": "Plans Created", "count": total_created, "percentage": 100},
                {"stage": "Plans Started", "count": started, "percentage": round(started / total_created * 100, 1) if total_created > 0 else 0},
                {"stage": "Plans Completed", "count": completed, "percentage": round(completed / total_created * 100, 1) if total_created > 0 else 0},
                {"stage": "NHS UDA Delivered", "count": nhs_delivered, "percentage": round(nhs_delivered / total_created * 100, 1) if total_created > 0 else 0}
            ]
        
            result = {"funnel": funnel}
        
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_funnel", result, period)
        
            return result
    except Exception as e:
        print(f"Error in treatment-plan-funnel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TREATMENT PLAN NEW CHARTS ====================

@app.get("/api/dashboard/treatment-plan-dow-creation")
def get_treatment_plan_dow_creation(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get plan creation count grouped by day of week"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_dow_creation", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"""
                SELECT EXTRACT(DOW FROM created_at) as dow,
                       COUNT(*) as count
                FROM dentally_treatment_plans
                WHERE {w}
                GROUP BY EXTRACT(DOW FROM created_at)
                ORDER BY dow
            """, p)
            days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            data = [{"day": days[int(r['dow'])], "count": r['count']} for r in cursor.fetchall()]
            result = {"distribution": data}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_dow_creation", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-dow-creation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-hour-completion")
def get_treatment_plan_hour_completion(period: str = "90d", start_date: str = None, end_date: str = None):
    """Get plan completions grouped by hour of day"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_hour_completion", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("completed_at"))
            cursor.execute(f"""
                SELECT EXTRACT(HOUR FROM completed_at) as hod,
                       COUNT(*) as count
                FROM dentally_treatment_plans
                WHERE {w} AND completed = true AND completed_at IS NOT NULL
                GROUP BY EXTRACT(HOUR FROM completed_at)
                ORDER BY hod
            """, p)
            data = [{"hour": int(r['hod']), "count": r['count']} for r in cursor.fetchall()]
            result = {"distribution": data}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_hour_completion", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-hour-completion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-backlog")
def get_treatment_plan_backlog(period: str = "1y", start_date: str = None, end_date: str = None):
    """Get cumulative plan backlog (created - completed) over time"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_backlog", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"""
                SELECT TO_CHAR(created_at::date, 'YYYY-MM') as month,
                       COUNT(*) as created,
                       SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed
                FROM dentally_treatment_plans
                WHERE {w}
                GROUP BY TO_CHAR(created_at::date, 'YYYY-MM')
                ORDER BY month ASC
            """, p)
            rows = cursor.fetchall()
            backlog = 0
            data = []
            for r in rows:
                backlog += (r['created'] or 0) - (r['completed'] or 0)
                data.append({
                    "month": r['month'],
                    "created": r['created'] or 0,
                    "completed": r['completed'] or 0,
                    "backlog": backlog
                })
            result = {"backlog": data}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_backlog", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-backlog: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-aging")
def get_treatment_plan_aging(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get aging distribution of active (non-completed) plans by days since start_date"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_aging", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("created_at"))
            cursor.execute(f"""
                SELECT
                    CASE
                        WHEN EXTRACT(DAY FROM NOW() - start_date) < 30 THEN '< 30 days'
                        WHEN EXTRACT(DAY FROM NOW() - start_date) < 60 THEN '30-60 days'
                        WHEN EXTRACT(DAY FROM NOW() - start_date) < 90 THEN '60-90 days'
                        WHEN EXTRACT(DAY FROM NOW() - start_date) < 180 THEN '90-180 days'
                        ELSE '180+ days'
                    END as bucket,
                    COUNT(*) as count
                FROM dentally_treatment_plans
                WHERE {w}
                AND completed != true
                AND start_date IS NOT NULL
                GROUP BY bucket
                ORDER BY MIN(EXTRACT(DAY FROM NOW() - start_date))
            """, p)
            data = [{"bucket": r['bucket'], "count": r['count']} for r in cursor.fetchall()]
            result = {"aging": data}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_aging", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-aging: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-nhs-delivery-rate")
def get_treatment_plan_nhs_delivery_rate(period: str = "30d", start_date: str = None, end_date: str = None):
    """Get NHS UDA delivery rate per practitioner"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_nhs_delivery_rate", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("tp.created_at"))
            cursor.execute(f"""
                SELECT COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as practitioner_name,
                       COALESCE(SUM(tp.nhs_uda_value), 0) as allocated,
                       COALESCE(SUM(tp.nhs_completed_uda_value), 0) as delivered,
                       COUNT(DISTINCT tp.id) as plan_count
                FROM dentally_practitioners p
                LEFT JOIN dentally_treatment_plans tp ON tp.practitioner_id = p.dentally_id AND {w}
                WHERE p.active = true
                GROUP BY p.id, p.first_name, p.last_name
                HAVING COALESCE(SUM(tp.nhs_uda_value), 0) > 0
                ORDER BY delivered DESC
                LIMIT 10
            """, p)
            practitioners = []
            for r in cursor.fetchall():
                allocated = float(r['allocated'] or 0)
                delivered = float(r['delivered'] or 0)
                rate = round((delivered / allocated * 100), 1) if allocated > 0 else 0
                practitioners.append({
                    "name": r['practitioner_name'],
                    "allocated": allocated,
                    "delivered": delivered,
                    "deliveryRate": rate,
                    "planCount": r['plan_count'] or 0
                })
            result = {"practitioners": practitioners}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_nhs_delivery_rate", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-nhs-delivery-rate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/treatment-plan-duration-distribution")
def get_treatment_plan_duration_distribution(period: str = "90d", start_date: str = None, end_date: str = None):
    """Get distribution of days to complete plans"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_treatment_plan_duration_distribution", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, column_expr=ts("completed_at"))
            cursor.execute(f"""
                SELECT
                    CASE
                        WHEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 < 7 THEN '< 7 days'
                        WHEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 < 14 THEN '7-14 days'
                        WHEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 < 30 THEN '14-30 days'
                        WHEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 < 60 THEN '30-60 days'
                        WHEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 < 90 THEN '60-90 days'
                        ELSE '90+ days'
                    END as bucket,
                    COUNT(*) as count
                FROM dentally_treatment_plans
                WHERE {w}
                AND completed = true
                AND completed_at IS NOT NULL
                AND start_date IS NOT NULL
                GROUP BY bucket
                ORDER BY MIN(EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400)
            """, p)
            data = [{"bucket": r['bucket'], "count": r['count']} for r in cursor.fetchall()]
            result = {"distribution": data}
            if not start_date and not end_date:
                save_cache("dashboard_treatment_plan_duration_distribution", result, period)
            return result
    except Exception as e:
        print(f"Error in treatment-plan-duration-distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== APPOINTMENTS ====================

@app.get("/api/dashboard/appointments-kpis")
def get_appointments_kpis(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments KPI metrics"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_kpis", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(length_minutes) as total_minutes FROM dentally_appointments WHERE {w}", p)
            stats = cur.fetchone()
            total = stats["total"] or 0
            completed = stats["completed"] or 0
            cancelled = stats["cancelled"] or 0
            total_minutes = float(stats["total_minutes"] or 0)
            cur.execute(f"SELECT COUNT(*) as fta FROM dentally_appointments WHERE {w} AND did_not_attend_at IS NOT NULL", p)
            fta = cur.fetchone()["fta"] or 0
            cur.execute(f"SELECT status, COUNT(*) as count FROM dentally_appointments WHERE {w} GROUP BY status ORDER BY count DESC", p)
            status_breakdown = {r["status"]: r["count"] for r in cur.fetchall()}
            avg_duration = round(total_minutes / total, 0) if total > 0 else 0
            fta_rate = round((fta / total) * 100, 1) if total > 0 else 0
            completion_rate = round((completed / total) * 100, 1) if total > 0 else 0
            result = {
                "totalAppointments": total, "completedAppointments": completed,
                "cancelledAppointments": cancelled, "dnaCount": fta, "dnaRate": fta_rate,
                "avgDuration": avg_duration, "totalMinutes": round(total_minutes, 0),
                "completionRate": completion_rate, "statusBreakdown": status_breakdown,
            }
            if not start_date and not end_date:
                save_cache("dashboard_appointments_kpis", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-kpis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-trend")
def get_appointments_trend(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments trend over time"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_trend", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            if start_date and end_date:
                cur.execute(f"SELECT start_time::date as appt_date, COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_appointments WHERE {build_date_clause(period, start_date, end_date, ts('start_time'))[0]} GROUP BY appt_date ORDER BY appt_date", build_date_clause(period, start_date, end_date, ts('start_time'))[1])
                rows = cur.fetchall()
                chart_data = [{"date": str(r["appt_date"]), "total": r["total"] or 0, "completed": r["completed"] or 0, "cancelled": r["cancelled"] or 0, "fta": r["fta"] or 0} for r in rows]
            else:
                period_map = {"today": 0, "7d": 6, "30d": 29, "90d": 89, "1y": 364, "all": 364}
                days_back = period_map.get(period, 6)
                date_points = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days_back, -1, -1)]
                w_trend, p_trend = build_date_clause(period, start_date, end_date, ts('start_time'))
                cur.execute(f"SELECT start_time::date as appt_date, COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_appointments WHERE {w_trend} GROUP BY appt_date ORDER BY appt_date", p_trend)
                db_rows = {str(r["appt_date"]): r for r in cur.fetchall()}
                chart_data = [{"date": d, "total": db_rows.get(d, {}).get("total") or 0, "completed": db_rows.get(d, {}).get("completed") or 0, "cancelled": db_rows.get(d, {}).get("cancelled") or 0, "fta": db_rows.get(d, {}).get("fta") or 0} for d in date_points]
            result = {"chart_data": chart_data}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_trend", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-trend: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-by-site")
def get_appointments_by_site(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments by site"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_by_site", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("a.start_time"))
            cur.execute(f"SELECT s.name as site_name, COUNT(DISTINCT a.id) as total_appointments, SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_sites s LEFT JOIN dentally_appointments a ON s.dentally_id = a.site_id AND {w} WHERE s.active = 1 GROUP BY s.id, s.name ORDER BY total_appointments DESC", p)
            sites = [{"name": r["site_name"], "appointments": r["total_appointments"] or 0, "completed": r["completed"] or 0} for r in cur.fetchall()]
            result = {"sites": sites}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_by_site", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-by-site: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-by-practitioner")
def get_appointments_by_practitioner(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments by practitioner"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_by_practitioner", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("a.start_time"))
            cur.execute(f"SELECT p.dentally_id as practitioner_id, p.first_name || ' ' || p.last_name as practitioner_name, p.role, COUNT(DISTINCT a.id) as total_appointments, SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN a.did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_practitioners p LEFT JOIN dentally_appointments a ON p.dentally_id = a.practitioner_id AND {w} WHERE p.active = true GROUP BY p.dentally_id, p.first_name, p.last_name, p.role ORDER BY total_appointments DESC LIMIT 15", p)
            practitioners = []
            for row in cur.fetchall():
                total_a = row["total_appointments"] or 0
                compl = row["completed"] or 0
                practitioners.append({
                    "id": row["practitioner_id"], "name": row["practitioner_name"], "role": row["role"],
                    "appointments": total_a, "completed": compl, "fta": row["fta"] or 0,
                    "completionRate": round((compl / total_a) * 100, 1) if total_a > 0 else 0,
                })
            result = {"practitioners": practitioners}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_by_practitioner", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-by-practitioner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/recent-appointments")
def get_recent_appointments(period: str = "7d", start_date: str = None, end_date: str = None, limit: int = 10):
    """Get recent appointments"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_recent_appointments", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT a.id, COALESCE(pt.first_name || ' ' || pt.last_name, a.patient_name, 'Unknown') as patient_name, COALESCE(pr.first_name || ' ' || pr.last_name, a.practitioner_name, 'Unknown') as practitioner_name, a.reason, a.start_time, a.duration, a.length_minutes, a.status, a.did_not_attend_at, a.notes FROM dentally_appointments a LEFT JOIN dentally_practitioners pr ON pr.dentally_id = a.practitioner_id LEFT JOIN dentally_patients pt ON pt.dentally_id = a.patient_id WHERE {w} ORDER BY a.start_time DESC LIMIT %s", p + (limit,))
            appointments = []
            for row in cur.fetchall():
                start = row["start_time"]
                formatted_start = ""
                if start:
                    try:
                        dt_val = datetime.strptime(str(start)[:19], "%Y-%m-%d %H:%M:%S")
                        formatted_start = dt_val.strftime("%d %b %Y, %H:%M")
                    except ValueError:
                        try:
                            dt_val = datetime.strptime(str(start)[:19], "%Y-%m-%dT%H:%M:%S")
                            formatted_start = dt_val.strftime("%d %b %Y, %H:%M")
                        except ValueError:
                            formatted_start = str(start)[:16]
                status = (row["status"] or "").lower()
                if row["did_not_attend_at"]:
                    status = "dna"
                display_status = "Completed" if status == "completed" else "Cancelled" if status == "cancelled" else "DNA" if status == "dna" else "Pending"
                appointments.append({
                    "id": row["id"], "patientName": row["patient_name"] or "Unknown",
                    "practitionerName": row["practitioner_name"] or "Unknown",
                    "reason": row["reason"] or "N/A", "startTime": formatted_start,
                    "duration": row["duration"] or row["length_minutes"], "status": display_status, "statusRaw": status,
                })
            result = {"appointments": appointments}
            if not start_date and not end_date:
                save_cache("dashboard_recent_appointments", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in recent-appointments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-by-reason")
def get_appointments_by_reason(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments by reason"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_by_reason", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT reason, COUNT(*) as count FROM dentally_appointments WHERE {w} AND reason IS NOT NULL AND reason != '' GROUP BY reason ORDER BY count DESC", p)
            reasons = [{"reason": r["reason"], "count": r["count"]} for r in cur.fetchall()]
            result = {"reasons": reasons}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_by_reason", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-by-reason: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-by-hour")
def get_appointments_by_hour(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments by hour of day"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_by_hour", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*) as count FROM dentally_appointments WHERE {w} GROUP BY hour ORDER BY hour", p)
            hours = [{"hour": r["hour"], "count": r["count"]} for r in cur.fetchall()]
            result = {"hours": hours}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_by_hour", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-by-hour: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-by-day")
def get_appointments_by_day(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointments by day of week"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_by_day", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT TO_CHAR(start_time, 'Day') as day, COUNT(*) as count FROM dentally_appointments WHERE {w} GROUP BY day ORDER BY MIN(EXTRACT(DOW FROM start_time))", p)
            days = [{"day": r["day"].strip(), "count": r["count"]} for r in cur.fetchall()]
            result = {"days": days}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_by_day", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-by-day: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-cancellation-by-day")
def get_appointments_cancellation_by_day(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get cancellation rate by day of week"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_cancellation_by_day", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT TO_CHAR(start_time, 'Day') as day, COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled, ROUND(COUNT(*) FILTER (WHERE status = 'Cancelled') * 100.0 / GREATEST(COUNT(*), 1), 1) as rate FROM dentally_appointments WHERE {w} GROUP BY day ORDER BY MIN(EXTRACT(DOW FROM start_time))", p)
            days = [{"day": r["day"].strip(), "total": r["total"], "cancelled": r["cancelled"], "rate": r["rate"]} for r in cur.fetchall()]
            result = {"days": days}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_cancellation_by_day", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-cancellation-by-day: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-lifecycle")
def get_appointments_lifecycle(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointment lifecycle (duration by hour)"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_lifecycle", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT EXTRACT(HOUR FROM start_time)::int as hour, ROUND(MIN(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as min_min, ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as avg_min, ROUND(MAX(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as max_min, COUNT(*) as count FROM dentally_appointments WHERE {w} AND completed_at IS NOT NULL  AND start_time IS NOT NULL GROUP BY hour ORDER BY hour", p)
            hours = [{"hour": r["hour"], "min": r["min_min"], "avg": r["avg_min"], "max": r["max_min"], "count": r["count"]} for r in cur.fetchall()]
            result = {"hours": hours}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_lifecycle", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-lifecycle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-duration")
def get_appointments_duration(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointment actual duration distribution"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_duration", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT CASE WHEN completed_at - start_time <= INTERVAL '15 minutes' THEN '<15 min' WHEN completed_at - start_time <= INTERVAL '30 minutes' THEN '15-30 min' WHEN completed_at - start_time <= INTERVAL '45 minutes' THEN '30-45 min' WHEN completed_at - start_time <= INTERVAL '60 minutes' THEN '45-60 min' ELSE '60+ min' END as bucket, COUNT(*) as count FROM dentally_appointments WHERE {w} AND completed_at IS NOT NULL  AND start_time IS NOT NULL GROUP BY bucket ORDER BY MIN(completed_at - start_time)", p)
            buckets = [{"bucket": r["bucket"], "count": r["count"]} for r in cur.fetchall()]
            result = {"buckets": buckets}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_duration", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-duration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/appointments-heatmap")
def get_appointments_heatmap(period: str = "7d", start_date: str = None, end_date: str = None):
    """Get appointment day-hour heatmap"""
    if not start_date and not end_date:
        cached = get_cache("dashboard_appointments_heatmap", period)
        if cached:
            return cached
    try:
        with db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            w, p = build_date_clause(period, start_date, end_date, ts("start_time"))
            cur.execute(f"SELECT TO_CHAR(start_time, 'Day') as day_name, EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*) as count FROM dentally_appointments WHERE {w} GROUP BY day_name, hour ORDER BY MIN(EXTRACT(DOW FROM start_time)), hour", p)
            heatmap = []
            current_day = None
            for r in cur.fetchall():
                dn = r["day_name"].strip()
                if dn != current_day:
                    heatmap.append({"day": dn, "data": []})
                    current_day = dn
                heatmap[-1]["data"].append({"hour": r["hour"], "count": r["count"]})
            result = {"heatmap": heatmap}
            if not start_date and not end_date:
                save_cache("dashboard_appointments_heatmap", result, period)
            return result
    except Exception as e:
        logger.error(f"Error in appointments-heatmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CACHE MANAGEMENT ====================

@app.post("/api/admin/cache/refresh-page")
def refresh_page_cache(request: Request):
    """Refresh cache for a specific page"""
    try:
        body = request.query_params.get("page")
        page = body if body else "all"
        
        if page == "all":
            # Clear all cache files
            import glob
            cache_files = glob.glob(os.path.join(CACHE_DIR, "*.json"))
            for f in cache_files:
                try:
                    os.remove(f)
                except:
                    pass
            return {"status": "success", "message": f"Cleared {len(cache_files)} cache files"}
        else:
            # Clear specific page cache
            page_cache_map = {
                "dashboard": ["dashboard_metrics", "dashboard_ai_insights", "dashboard_health_score", 
                             "dashboard_nhs_chart", "dashboard_league", "dashboard_sites",
                             "dashboard_finance_metrics", "dashboard_clinicians_league",
                             "dashboard_operations_kpis", "dashboard_practice_league",
                             "dashboard_revenue_by_stream", "dashboard_profit_per_practice",
                             "dashboard_capacity_data", "dashboard_recall_backlog", "dashboard_case_acceptance"],
                "invoices": ["dashboard_invoices_kpis", "dashboard_invoices_trend", 
                            "dashboard_revenue_by_site", "dashboard_revenue_by_treatment",
                            "dashboard_top_patients_by_revenue", "dashboard_invoices_kpis_datedon",
                            "dashboard_invoices_trend_datedon", "dashboard_revenue_by_site_datedon",
                            "dashboard_top_patients_by_revenue_datedon", "dashboard_treatment_frequency",
                            "dashboard_treatment_mix_by_practice", "dashboard_revenue_by_account",
                            "dashboard_outstanding_by_account"],
                "treatment-plans": ["dashboard_treatment_plan_kpis", "dashboard_treatment_plans_by_practitioner",
                                   "dashboard_treatment_plan_items", "dashboard_treatment_plans_by_treatment",
                                   "dashboard_treatment_plan_trends", "dashboard_treatment_trends",
                                   "dashboard_treatment_plan_duration", "dashboard_treatment_plan_patients",
                                   "dashboard_treatment_plan_velocity", "dashboard_treatment_plan_value_distribution",
                                    "dashboard_treatment_plan_completion_heatmap", "dashboard_treatment_plan_nhs_vs_private",
                                    "dashboard_treatment_plan_funnel",
                                    "dashboard_treatment_plan_dow_creation", "dashboard_treatment_plan_hour_completion",
                                    "dashboard_treatment_plan_backlog", "dashboard_treatment_plan_aging",
                                    "dashboard_treatment_plan_nhs_delivery_rate", "dashboard_treatment_plan_duration_distribution"],
                "clinicians": ["dashboard_clinicians_league", "dashboard_practice_league"],
                "appointments": ["dashboard_appointments_kpis", "dashboard_appointments_trend",
                                "dashboard_appointments_by_site", "dashboard_appointments_by_practitioner",
                                "dashboard_recent_appointments", "dashboard_appointments_by_reason",
                                "dashboard_appointments_by_hour", "dashboard_appointments_by_day",
                                "dashboard_appointments_cancellation_by_day", "dashboard_appointments_lifecycle",
                                "dashboard_appointments_duration", "dashboard_appointments_heatmap"],
            }
            
            cache_keys = page_cache_map.get(page, [])
            cleared = 0
            for key in cache_keys:
                # Clear all period variants
                import glob
                pattern = os.path.join(CACHE_DIR, f"{key}_*.json")
                files = glob.glob(pattern)
                for f in files:
                    try:
                        os.remove(f)
                        cleared += 1
                    except:
                        pass
                
                # Clear base cache file
                base_file = os.path.join(CACHE_DIR, f"{key}.json")
                if os.path.exists(base_file):
                    try:
                        os.remove(base_file)
                        cleared += 1
                    except:
                        pass
            
            return {"status": "success", "message": f"Cleared {cleared} cache files for {page}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)