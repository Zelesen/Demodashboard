"""Precompute all dashboard data and cache as JSON files.
Run this periodically (e.g., via cron) to refresh the cache.

Usage:
    python precompute.py              # Cache all periods
    python precompute.py --period 7d  # Cache specific period only
    python precompute.py --list       # List cached endpoints
    python precompute.py --clear      # Clear all cache
"""

import json
import os
import sys
import glob
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
PERIODS = ["today", "7d", "30d", "90d", "1y", "all"]

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "54322")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")


def ts(col):
    return col


def dt(col):
    return col


def build_date_clause(period, column_expr="created_at"):
    if period == "all":
        return "TRUE", ()
    period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = period_map.get(period, 7)
    return (f"{column_expr} >= CURRENT_DATE - INTERVAL %s", (f"{days} days",))


def get_db():
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    return conn, conn.cursor(cursor_factory=RealDictCursor)


def save_cache(name, data, period=None):
    os.makedirs(CACHE_DIR, exist_ok=True)
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name}_{period}_{now}.json" if period else f"{name}_{now}.json"
    path = os.path.join(CACHE_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, default=str, indent=2)
    print(f"  Cached: {filename}")
    return path


def load_cache(name, period=None):
    pattern = f"{name}_{period}_*.json" if period else f"{name}_*.json"
    files = glob.glob(os.path.join(CACHE_DIR, pattern))
    if not files:
        old = f"{name}_{period}.json" if period else f"{name}.json"
        old_path = os.path.join(CACHE_DIR, old)
        if os.path.exists(old_path):
            files = [old_path]
        else:
            return None
    newest = max(files, key=os.path.getmtime)
    with open(newest) as f:
        return json.load(f)


# ==================== DASHBOARD METRICS ====================

def cache_dashboard_metrics(period):
    conn, cur = get_db()
    try:
        w_prod, p_prod = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as total_production FROM dentally_invoices WHERE {w_prod}", p_prod)
        production = cur.fetchone()["total_production"] or 0

        w_appt, p_appt = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT COUNT(*) as total_appointments, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_appointments WHERE {w_appt}", p_appt)
        appt_stats = cur.fetchone()
        nhs_delivery = (appt_stats["completed"] / appt_stats["total_appointments"] * 100) if appt_stats["total_appointments"] > 0 else 0

        w_priv, p_priv = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as private_revenue FROM dentally_invoices WHERE {w_priv}", p_priv)
        private_revenue = cur.fetchone()["private_revenue"] or 0

        cur.execute("SELECT COUNT(*) as plan_members FROM dentally_payment_plans WHERE active = true")
        plan_members = cur.fetchone()["plan_members"] or 0

        w_pat, p_pat = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT COUNT(*) as new_patients FROM dentally_patients WHERE {w_pat}", p_pat)
        new_patients = cur.fetchone()["new_patients"] or 0

        w_cash, p_cash = build_date_clause(period, column_expr=ts("dated_on"))
        cur.execute(f"SELECT SUM(amount::numeric) as cash_position FROM dentally_payments WHERE {w_cash}", p_cash)
        cash_position = cur.fetchone()["cash_position"] or 0

        data = {
            "group_production": {"value": f"\u00a3{float(production)/1000:.1f}k", "change": "+10.1pp", "footer": "107.6% to target", "positive": True},
            "nhs_uda_delivery": {"value": f"{nhs_delivery:.1f}%", "change": "-0.2pp", "footer": "glidepath 23%", "positive": False},
            "private_plan_revenue": {"value": f"\u00a3{float(private_revenue)/1000:.1f}k", "change": "+5.8%", "footer": "75.2% of income", "positive": True},
            "plan_members": {"value": f"+{plan_members}", "change": "+3.7%", "footer": f"{plan_members + 4800} active", "positive": True},
            "new_patients": {"value": str(new_patients), "change": "-3.9%", "footer": "53.3% to plan", "positive": False},
            "group_cash_position": {"value": f"\u00a3{float(cash_position)/1000:.1f}k", "change": "+5.7%", "footer": "vs prev 7 days", "positive": True},
        }
        save_cache("dashboard_metrics", data, period)
    finally:
        conn.close()


# ==================== AI INSIGHTS ====================

def cache_ai_insights(period):
    conn, cur = get_db()
    try:
        w_ai, p_ai = build_date_clause(period, column_expr=ts("a.start_time"))
        cur.execute(f"""
            SELECT s.name as site_name, COUNT(DISTINCT a.id) as total_appointments,
                   SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed_appointments
            FROM dentally_sites s
            LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND ({w_ai})
            GROUP BY s.name ORDER BY completed_appointments ASC LIMIT 3
        """, p_ai)
        underperforming = cur.fetchall()
        insights = []
        for site in underperforming:
            total = site["total_appointments"] or 0
            completed = site["completed_appointments"] or 0
            rate = (completed / total * 100) if total > 0 else 0
            insights.append(["ACT", f"\u00a3{1000 + rate * 10:.1f}k at stake", f"{site['site_name']} is {100 - rate:.1f}% behind target completion rate."])
        save_cache("dashboard_ai_insights", {"insights": insights[:3]}, period)
    finally:
        conn.close()


# ==================== HEALTH SCORE ====================

def cache_health_score(period):
    conn, cur = get_db()
    try:
        w_hp, p_hp = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as total FROM dentally_invoices WHERE {w_hp}", p_hp)
        production = cur.fetchone()["total"] or 0
        production_score = min(100, int(float(production) / 10000))

        w_ha, p_ha = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_appointments WHERE {w_ha}", p_ha)
        appts = cur.fetchone()
        nhs_score = int((appts["completed"] / appts["total"] * 100)) if appts["total"] > 0 else 0

        w_hpriv, p_hpriv = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as total FROM dentally_invoices WHERE {w_hpriv}", p_hpriv)
        private_total = cur.fetchone()["total"] or 0
        private_score = min(100, int(float(private_total) / 15000))

        w_rec, p_rec = build_date_clause(period, column_expr=ts("recall_date"))
        cur.execute(f"SELECT COUNT(*) as total FROM dentally_recalls WHERE {w_rec}", p_rec)
        recalls = cur.fetchone()["total"] or 0
        recall_score = min(100, int(recalls / 10))

        w_hpat, p_hpat = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT COUNT(*) as total FROM dentally_patients WHERE {w_hpat}", p_hpat)
        new_patients = cur.fetchone()["total"] or 0
        reputation_score = min(100, int(new_patients / 5))

        pillars = [production_score, nhs_score, private_score, recall_score, reputation_score]
        overall_score = int(sum(pillars) / len(pillars))
        save_cache("dashboard_health_score", {"health_score": overall_score, "health_pillars": pillars}, period)
    finally:
        conn.close()


# ==================== LEAGUE (DASHBOARD) ====================

def cache_league(period):
    conn, cur = get_db()
    try:
        w_league, p_league = build_date_clause(period, column_expr=ts("a.start_time"))
        cur.execute(f"""
            SELECT s.name as site_name, COUNT(DISTINCT a.id) as total_appointments,
                   SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed,
                   COALESCE(SUM(i.amount::numeric), 0) as revenue
            FROM dentally_sites s
            LEFT JOIN dentally_appointments a ON s.id::text = a.site_id
            LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
            WHERE {w_league}
            GROUP BY s.name ORDER BY revenue DESC
        """, p_league)
        practices = []
        for row in cur.fetchall():
            rate = (row["completed"] / row["total_appointments"] * 100) if row["total_appointments"] > 0 else 0
            score = min(100, int(rate + float(row["revenue"] or 0) / 1000))
            practices.append({
                "name": row["site_name"], "revenue": f"\u00a3{float(row['revenue'] or 0)/1000:.1f}k",
                "nhs": f"{rate:.1f}% NHS", "plan": "+0 plan", "rating": "4.0",
                "score": f"{score}%", "status": "good" if score >= 80 else "warn" if score >= 60 else "bad",
                "scoreVal": score,
            })
        save_cache("dashboard_league", {"practices": practices}, period)
    finally:
        conn.close()


# ==================== SITES ====================

def cache_sites():
    conn, cur = get_db()
    try:
        cur.execute("SELECT name, town, postcode, active FROM dentally_sites WHERE active = 1")
        sites = [{"name": r["name"], "lat": 52.5, "lng": -1.5, "active": r["active"]} for r in cur.fetchall()]
        save_cache("dashboard_sites", {"sites": sites})
    finally:
        conn.close()


# ==================== FINANCE METRICS ====================

def cache_finance_metrics(period):
    conn, cur = get_db()
    try:
        w_fprod, p_fprod = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as total FROM dentally_invoices WHERE {w_fprod}", p_fprod)
        production = cur.fetchone()["total"] or 0
        w_fappt, p_fappt = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_appointments WHERE {w_fappt}", p_fappt)
        appts = cur.fetchone()
        nhs_delivery = (appts["completed"] / appts["total"] * 100) if appts["total"] > 0 else 0
        w_fpriv, p_fpriv = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT SUM(amount::numeric) as total FROM dentally_invoices WHERE {w_fpriv}", p_fpriv)
        private_revenue = cur.fetchone()["total"] or 0
        cur.execute("SELECT COUNT(*) as total FROM dentally_payment_plans WHERE active = true")
        plan_members = cur.fetchone()["total"] or 0
        w_fpat, p_fpat = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT COUNT(*) as total FROM dentally_patients WHERE {w_fpat}", p_fpat)
        new_patients = cur.fetchone()["total"] or 0
        w_fcash, p_fcash = build_date_clause(period, column_expr=ts("dated_on"))
        cur.execute(f"SELECT SUM(amount::numeric) as total FROM dentally_payments WHERE {w_fcash}", p_fcash)
        cash = cur.fetchone()["total"] or 0
        save_cache("dashboard_finance_metrics", {
            "group_production": {"value": float(production), "positive": True},
            "nhs_delivery": {"value": nhs_delivery, "positive": nhs_delivery >= 100},
            "private_plan_revenue": {"value": float(private_revenue), "positive": True},
            "plan_members": {"value": plan_members, "positive": True},
            "new_patients": {"value": new_patients, "positive": True},
            "cash_position": {"value": float(cash), "positive": True},
        }, period)
    finally:
        conn.close()


# ==================== REVENUE BY STREAM ====================

def cache_revenue_by_stream(period):
    conn, cur = get_db()
    try:
        date_points = []
        period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = period_map.get(period, 7)
        if period == "today":
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
        elif period in ("7d", "30d", "90d"):
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i) for i in range(days - 1, -1, -1)]
        else:
            date_points = [datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30 * i) for i in range(11, -1, -1)]

        chart_data = []
        for date in date_points:
            date_str = date.strftime("%Y-%m-%d")
            date_label = date.strftime("%d %b") if period in ("today", "7d", "30d", "90d") else date.strftime("%b %Y")
            cur.execute(f"SELECT SUM(i.amount) as total_revenue FROM dentally_invoices i WHERE {dt('i.created_at')} = %s", (date_str,))
            row = cur.fetchone()
            chart_data.append({"date": date_label, "total": float(row["total_revenue"] or 0)})
        save_cache("dashboard_revenue_by_stream", {"chart_data": chart_data}, period)
    finally:
        conn.close()


# ==================== PROFIT PER PRACTICE ====================

def cache_profit_per_practice():
    conn, cur = get_db()
    try:
        cur.execute(f"""
            SELECT s.name as practice, COALESCE(SUM(i.amount), 0) as revenue,
                   COUNT(DISTINCT a.id) as volume
            FROM dentally_sites s
            LEFT JOIN dentally_invoices i ON s.id::text = i.site_id AND {ts('i.created_at')} >= CURRENT_DATE - INTERVAL '30 days'
            LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND {ts('a.start_time')} >= CURRENT_DATE - INTERVAL '30 days' AND LOWER(a.status) = 'completed'
            WHERE s.active = 1 GROUP BY s.id, s.name
        """)
        practices = []
        for row in cur.fetchall():
            margin = min(40, max(10, (float(row["revenue"]) / 1000) + 10))
            practices.append({
                "name": row["practice"], "revenue": float(row["revenue"]),
                "margin": round(margin, 1), "volume": row["volume"],
                "color": "#10b981" if margin >= 20 else "#f59e0b" if margin >= 15 else "#ef4444",
            })
        save_cache("dashboard_profit_per_practice", {"practices": practices})
    finally:
        conn.close()


# ==================== INVOICE KPIs ====================

def cache_invoices_kpis(period):
    conn, cur = get_db()
    try:
        w_ik, p_ik = build_date_clause(period, "created_at")

        cur.execute(f"SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM dentally_invoices WHERE {w_ik}", p_ik)
        inv = cur.fetchone()
        total_invoices = inv["total"] or 0
        total_amount = float(inv["total_amount"] or 0)

        cur.execute(f"SELECT COALESCE(SUM(amount_outstanding), 0) as outstanding FROM dentally_invoices WHERE {w_ik} AND amount_outstanding > 0", p_ik)
        outstanding = float(cur.fetchone()["outstanding"] or 0)

        cur.execute(f"SELECT COUNT(*) as paid_count, COALESCE(SUM(amount), 0) as paid_amount FROM dentally_invoices WHERE {w_ik} AND paid = true", p_ik)
        paid = cur.fetchone()
        paid_count = paid["paid_count"] or 0
        paid_amount = float(paid["paid_amount"] or 0)

        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as total_revenue FROM dentally_invoices WHERE {w_ik}", p_ik)
        total_revenue = float(cur.fetchone()["total_revenue"] or 0)

        avg_value = total_amount / total_invoices if total_invoices > 0 else 0
        collection_rate = ((total_amount - outstanding) / total_amount * 100) if total_amount > 0 else 0

        save_cache("dashboard_invoices_kpis", {
            "totalInvoices": total_invoices, "totalRevenue": round(total_amount, 2),
            "outstanding": round(outstanding, 2), "paidInvoices": paid_count,
            "paidAmount": round(paid_amount, 2), "avgInvoiceValue": round(avg_value, 2),
            "collectionRate": round(collection_rate, 1),
        }, period)
    finally:
        conn.close()


# ==================== INVOICE TREND ====================

def cache_invoices_trend(period):
    conn, cur = get_db()
    try:
        period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 365}
        days = period_map.get(period, 30)
        if period == "today":
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
        elif period in ("7d", "30d", "90d"):
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i) for i in range(days - 1, -1, -1)]
        else:
            date_points = [datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30 * i) for i in range(11, -1, -1)]

        chart_data = []
        for date in date_points:
            date_str = date.strftime("%Y-%m-%d")
            date_label = date.strftime("%d %b") if period in ("today", "7d", "30d", "90d") else date.strftime("%b %Y")
            cur.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, COALESCE(SUM(CASE WHEN paid = true THEN amount ELSE 0 END), 0) as paid FROM dentally_invoices WHERE created_at::date = %s", (date_str,))
            row = cur.fetchone()
            total = float(row["total"] or 0)
            paid = float(row["paid"] or 0)
            chart_data.append({"date": date_label, "count": row["count"] or 0, "total": total, "paid": paid, "outstanding": total - paid})
        save_cache("dashboard_invoices_trend", {"chart_data": chart_data}, period)
    finally:
        conn.close()


# ==================== REVENUE BY SITE ====================

def cache_revenue_by_site(period):
    conn, cur = get_db()
    try:
        w_rs, p_rs = build_date_clause(period, column_expr=ts("i.created_at"))
        cur.execute(f"SELECT s.name as site_name, COALESCE(SUM(i.amount), 0) as revenue, COUNT(DISTINCT i.id) as invoice_count FROM dentally_sites s LEFT JOIN dentally_invoices i ON s.id::text = i.site_id AND {w_rs} WHERE s.active = 1 GROUP BY s.id, s.name ORDER BY revenue DESC", p_rs)
        sites = [{"name": r["site_name"], "revenue": float(r["revenue"] or 0), "invoices": r["invoice_count"] or 0} for r in cur.fetchall()]
        save_cache("dashboard_revenue_by_site", {"sites": sites}, period)
    finally:
        conn.close()


# ==================== CLINICIANS LEAGUE ====================

def cache_clinicians_league(period):
    conn, cur = get_db()
    try:
        w_cl_appt, p_cl_appt = build_date_clause(period, column_expr=ts("a.start_time"))
        w_cl_inv, p_cl_inv = build_date_clause(period, column_expr=ts("i.created_at"))
        cur.execute(f"""
            SELECT p.id, p.first_name || ' ' || p.last_name as name, p.role, s.name as practice,
                   COUNT(DISTINCT a.id) as sessions, COALESCE(SUM(i.amount::numeric), 0) as production,
                   COALESCE(SUM(CASE WHEN a.did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END), 0) as fta_count
            FROM dentally_practitioners p
            LEFT JOIN dentally_sites s ON p.site_id = s.id::text
            LEFT JOIN dentally_appointments a ON p.id = a.practitioner_id AND {w_cl_appt}
            LEFT JOIN dentally_invoices i ON s.id::text = i.site_id AND {w_cl_inv}
            WHERE p.active = true
            GROUP BY p.id, p.first_name, p.last_name, p.role, s.name
            ORDER BY production DESC LIMIT 10
        """, (*p_cl_appt, *p_cl_inv))
        clinicians = []
        for idx, row in enumerate(cur.fetchall(), 1):
            prod_per_sess = float(row["production"]) / row["sessions"] if row["sessions"] > 0 else 0
            priv_mix = 75
            if float(row["production"]) > 0:
                priv_mix = min(100, max(0, 75 + (float(row["production"]) % 20) - 10))
            fta = (row["fta_count"] / row["sessions"] * 100) if row["sessions"] > 0 else 5
            clinicians.append({
                "rank": idx, "name": row["name"], "role": row["role"], "practice": row["practice"] or "Unknown",
                "sessions": row["sessions"], "production": float(row["production"]), "prodPerSess": prod_per_sess,
                "privMix": round(priv_mix, 0), "recall": 80, "fta": round(fta, 0), "compl": 5.0, "index": 60 + idx,
            })
        save_cache("dashboard_clinicians_league", {"clinicians": clinicians}, period)
    finally:
        conn.close()


# ==================== OPERATIONS KPIs ====================

def cache_operations_kpis(period):
    conn, cur = get_db()
    try:
        w_op_appt, p_op_appt = build_date_clause(period, column_expr=ts("start_time"))
        w_op_pat, p_op_pat = build_date_clause(period, column_expr=ts("created_at"))

        cur.execute(f"SELECT COUNT(*) as total_appointments, SUM(length_minutes) as total_minutes FROM dentally_appointments WHERE {w_op_appt} AND LOWER(status) != 'cancelled'", p_op_appt)
        appt_stats = cur.fetchone()
        avg_minutes = float(appt_stats["total_minutes"] or 0)
        total_booked = appt_stats["total_appointments"] or 0

        period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 365}
        period_days = period_map.get(period, 7)
        available_minutes = 8 * 8 * 60 * period_days
        utilisation = (avg_minutes / available_minutes * 100) if available_minutes > 0 else 0

        cur.execute(f"SELECT COUNT(*) as cancelled FROM dentally_appointments WHERE {w_op_appt} AND LOWER(status) = 'cancelled'", p_op_appt)
        cancelled = cur.fetchone()["cancelled"] or 0
        white_space = cancelled * 30

        cur.execute(f"SELECT COUNT(*) as delivered FROM dentally_appointments WHERE {w_op_appt} AND LOWER(status) = 'completed'", p_op_appt)
        uda_delivered = cur.fetchone()["delivered"] or 0
        uda_pace = (uda_delivered / max(period_days, 1) * 100 / 7) * 100 if period_days > 0 else 0

        cur.execute(f"SELECT COUNT(*) as overdue FROM dentally_recalls WHERE {ts('recall_date')} < CURRENT_DATE")
        recalls_overdue = cur.fetchone()["overdue"] or 0

        cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_appointments WHERE {w_op_appt}", p_op_appt)
        fta_stats = cur.fetchone()
        fta_rate = (fta_stats["fta"] / fta_stats["total"] * 100) if fta_stats["total"] > 0 else 0

        cur.execute(f"SELECT COUNT(*) as total FROM dentally_patients WHERE {w_op_pat}", p_op_pat)
        new_patients = cur.fetchone()["total"] or 0
        new_patient_rate = (new_patients / 50) * 100 if period_days <= 30 else (new_patients / max(period_days, 1) * 30) / 50 * 100

        save_cache("dashboard_operations_kpis", {
            "utilisation": round(utilisation, 1), "utilisationChange": -0.6,
            "whiteSpace": white_space, "whiteSpaceChange": 2.8,
            "udaPace": round(uda_pace, 1), "udaChange": 0.0,
            "recallsOverdue": recalls_overdue, "recallsChange": -27.6,
            "ftaShortNotice": round(fta_rate, 1), "ftaChange": -0.8,
            "newPatientRate": round(new_patient_rate, 1), "newPatientChange": 0.8,
        }, period)
    finally:
        conn.close()


# ==================== CASE ACCEPTANCE ====================

def cache_case_acceptance(period):
    conn, cur = get_db()
    try:
        w_ca, p_ca = build_date_clause(period, column_expr=ts("i.created_at"))
        cur.execute(f"SELECT p.role, AVG(i.amount) as avg_plan_value, COUNT(*) as case_count FROM dentally_practitioners p LEFT JOIN dentally_sites s ON p.site_id = s.id::text LEFT JOIN dentally_invoices i ON s.id::text = i.site_id AND {w_ca} WHERE p.active = true GROUP BY p.role", p_ca)
        scatter_data = []
        for row in cur.fetchall():
            base_x = float(row["avg_plan_value"]) if row["avg_plan_value"] else 500
            base_y = 65 if row["role"] == "Dentist" else 60
            for i in range(min(row["case_count"] or 5, 10)):
                scatter_data.append({"x": base_x + (i * 50) - 250, "y": base_y + (i * 3) - 15, "z": row["case_count"] or 5, "role": row["role"]})
        save_cache("dashboard_case_acceptance", {"scatter_data": scatter_data}, period)
    finally:
        conn.close()


# ==================== HYGIENE UTILIZATION ====================

def cache_hygiene_utilization(period):
    conn, cur = get_db()
    try:
        w_hu, p_hu = build_date_clause(period, column_expr=ts("a.start_time"))
        cur.execute(f"SELECT s.name, COUNT(DISTINCT a.id) as appointments, SUM(a.length_minutes) as total_minutes FROM dentally_sites s LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND {w_hu} AND LOWER(a.status) != 'cancelled' WHERE s.active = 1 GROUP BY s.id, s.name", p_hu)
        period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 365}
        days = period_map.get(period, 7)
        util_data = []
        for row in cur.fetchall():
            avail = 480 * (days / 7)
            util = min(100, max(0, float(row["total_minutes"] or 0) / avail * 100)) if avail > 0 else 0
            util_data.append({"name": row["name"], "value": round(util, 1)})
        save_cache("dashboard_hygiene_utilization", {"utilization_data": util_data}, period)
    finally:
        conn.close()


# ==================== NHS CHART ====================

def cache_nhs_chart():
    conn, cur = get_db()
    try:
        months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
        chart_data = []
        for i, month in enumerate(months):
            cur.execute(f"SELECT COUNT(*) as delivered FROM dentally_appointments WHERE TO_CHAR({ts('start_time')}, 'MM') = %s AND LOWER(status) = 'completed'", (f"{i+1:02d}",))
            delivered = cur.fetchone()["delivered"] or 0
            glidepath = 35 + (i * 7.5)
            chart_data.append({"month": month, "delivered": delivered if delivered > 0 else None, "glidepath": glidepath, "projected": 65 if i >= 3 else None})
        save_cache("dashboard_nhs_chart", {"chart_data": chart_data})
    finally:
        conn.close()


# ==================== CAPACITY DATA ====================

def cache_capacity_data():
    conn, cur = get_db()
    try:
        chart_data = []
        for i in range(6, -1, -1):
            date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            date_label = date.strftime("%d %b")
            cur.execute(f"SELECT COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END) as attended, COUNT(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 END) as fta, COUNT(CASE WHEN LOWER(status) = 'cancelled' THEN 1 END) as cancelled FROM dentally_appointments WHERE {dt('start_time')} = %s", (date_str,))
            row = cur.fetchone()
            chart_data.append({"day": date_label, "attended": row["attended"] or 0, "fta": row["fta"] or 0, "cancelled": row["cancelled"] or 0, "capacity": 250})
        save_cache("dashboard_capacity_data", {"chart_data": chart_data})
    finally:
        conn.close()


# ==================== RECALL BACKLOG ====================

def cache_recall_backlog():
    conn, cur = get_db()
    try:
        cur.execute(f"SELECT COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as overdue_30, COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '60 days' THEN 1 END) as overdue_60, COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as overdue_90, COUNT(CASE WHEN {ts('recall_date')} < CURRENT_DATE - INTERVAL '180 days' THEN 1 END) as overdue_180 FROM dentally_recalls WHERE {ts('recall_date')} < CURRENT_DATE")
        row = cur.fetchone()
        save_cache("dashboard_recall_backlog", {
            "recall_data": [
                {"category": "30 days overdue", "count": row["overdue_30"] or 0, "percentage": 100},
                {"category": "60 days overdue", "count": row["overdue_60"] or 0, "percentage": 71},
                {"category": "90 days overdue", "count": row["overdue_90"] or 0, "percentage": 56},
                {"category": "180+ days overdue", "count": row["overdue_180"] or 0, "percentage": 62},
            ]
        })
    finally:
        conn.close()


# ==================== PRACTICE LEAGUE (OPERATIONS) ====================

def cache_practice_league(period):
    conn, cur = get_db()
    try:
        w_pl, p_pl = build_date_clause(period, column_expr=ts("a.start_time"))
        cur.execute(f"SELECT s.name as practice, COUNT(DISTINCT a.id) as appointments, SUM(a.length_minutes) as total_minutes FROM dentally_sites s LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND {w_pl} AND LOWER(a.status) != 'cancelled' WHERE s.active = 1 GROUP BY s.id, s.name ORDER BY appointments DESC", p_pl)
        practices = []
        for idx, row in enumerate(cur.fetchall(), 1):
            util = float(row["total_minutes"] or 0) / 3360 * 100
            practices.append({"rank": idx, "name": row["practice"], "utilisation": round(util, 1), "appointments": row["appointments"]})
        save_cache("dashboard_practice_league", {"practices": practices}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS KPIs ====================

def cache_appointments_kpis(period):
    conn, cur = get_db()
    try:
        w_ak, p_ak = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(length_minutes) as total_minutes FROM dentally_appointments WHERE {w_ak}", p_ak)
        stats = cur.fetchone()
        total = stats["total"] or 0
        completed = stats["completed"] or 0
        cancelled = stats["cancelled"] or 0
        total_minutes = float(stats["total_minutes"] or 0)

        cur.execute(f"SELECT COUNT(*) as fta FROM dentally_appointments WHERE {w_ak} AND did_not_attend_at IS NOT NULL", p_ak)
        fta = cur.fetchone()["fta"] or 0

        cur.execute(f"SELECT status, COUNT(*) as count FROM dentally_appointments WHERE {w_ak} GROUP BY status ORDER BY count DESC", p_ak)
        status_breakdown = {r["status"]: r["count"] for r in cur.fetchall()}

        avg_duration = round(total_minutes / total, 0) if total > 0 else 0
        fta_rate = round((fta / total) * 100, 1) if total > 0 else 0
        completion_rate = round((completed / total) * 100, 1) if total > 0 else 0

        save_cache("dashboard_appointments_kpis", {
            "totalAppointments": total, "completedAppointments": completed,
            "cancelledAppointments": cancelled, "dnaCount": fta, "dnaRate": fta_rate,
            "avgDuration": avg_duration, "totalMinutes": round(total_minutes, 0),
            "completionRate": completion_rate, "statusBreakdown": status_breakdown,
        }, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS TREND ====================

def cache_appointments_trend(period):
    conn, cur = get_db()
    try:
        period_map = {"today": 0, "7d": 6, "30d": 29, "90d": 89, "1y": 364, "all": 364}
        days_back = period_map.get(period, 6)
        date_points = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days_back, -1, -1)]
        chart_data = []
        for date_str in date_points:
            cur.execute(f"SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(CASE WHEN did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_appointments WHERE start_time::date = %s::date", (date_str,))
            row = cur.fetchone()
            chart_data.append({"date": date_str, "total": row["total"] or 0, "completed": row["completed"] or 0, "cancelled": row["cancelled"] or 0, "fta": row["fta"] or 0})
        save_cache("dashboard_appointments_trend", {"chart_data": chart_data}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS BY SITE ====================

def cache_appointments_by_site(period):
    conn, cur = get_db()
    try:
        w_as, p_as = build_date_clause(period, column_expr=ts("a.start_time"))
        try:
            cur.execute(f"SELECT s.name as site_name, COUNT(DISTINCT a.id) as total_appointments, SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_sites s LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND {w_as} WHERE s.active = 1 GROUP BY s.id, s.name ORDER BY total_appointments DESC", p_as)
        except Exception:
            conn.rollback()
            cur.execute(f"SELECT s.name as site_name, COUNT(DISTINCT a.id) as total_appointments, SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed FROM dentally_sites s LEFT JOIN dentally_appointments a ON s.id::text = a.site_id AND {w_as} WHERE s.active = true GROUP BY s.id, s.name ORDER BY total_appointments DESC", p_as)
        sites = [{"name": r["site_name"], "appointments": r["total_appointments"] or 0, "completed": r["completed"] or 0} for r in cur.fetchall()]
        save_cache("dashboard_appointments_by_site", {"sites": sites}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS BY PRACTITIONER ====================

def cache_appointments_by_practitioner(period):
    conn, cur = get_db()
    try:
        w_ap, p_ap = build_date_clause(period, column_expr=ts("a.start_time"))
        cur.execute(f"SELECT p.dentally_id as practitioner_id, p.first_name || ' ' || p.last_name as practitioner_name, p.role, COUNT(DISTINCT a.id) as total_appointments, SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN a.did_not_attend_at IS NOT NULL THEN 1 ELSE 0 END) as fta FROM dentally_practitioners p LEFT JOIN dentally_appointments a ON p.dentally_id = a.practitioner_id AND {w_ap} WHERE p.active = true GROUP BY p.dentally_id, p.first_name, p.last_name, p.role ORDER BY total_appointments DESC LIMIT 15", p_ap)
        practitioners = []
        for row in cur.fetchall():
            total = row["total_appointments"] or 0
            compl = row["completed"] or 0
            practitioners.append({
                "id": row["practitioner_id"], "name": row["practitioner_name"], "role": row["role"],
                "appointments": total, "completed": compl, "fta": row["fta"] or 0,
                "completionRate": round((compl / total) * 100, 1) if total > 0 else 0,
            })
        save_cache("dashboard_appointments_by_practitioner", {"practitioners": practitioners}, period)
    finally:
        conn.close()


# ==================== RECENT APPOINTMENTS ====================

def cache_recent_appointments(period):
    conn, cur = get_db()
    try:
        w_ra, p_ra = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT a.id, COALESCE(pt.first_name || ' ' || pt.last_name, a.patient_name, 'Unknown') as patient_name, COALESCE(pr.first_name || ' ' || pr.last_name, a.practitioner_name, 'Unknown') as practitioner_name, a.reason, a.start_time, a.duration, a.length_minutes, a.status, a.did_not_attend_at, a.notes FROM dentally_appointments a LEFT JOIN dentally_practitioners pr ON pr.dentally_id = a.practitioner_id LEFT JOIN dentally_patients pt ON pt.dentally_id = a.patient_id WHERE {w_ra} ORDER BY a.start_time DESC LIMIT 10", p_ra)
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
        save_cache("dashboard_recent_appointments", {"appointments": appointments}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS BY REASON ====================

def cache_appointments_by_reason(period):
    conn, cur = get_db()
    try:
        w_ar, p_ar = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT reason, COUNT(*) as count FROM dentally_appointments WHERE {w_ar} AND reason IS NOT NULL AND reason != '' GROUP BY reason ORDER BY count DESC", p_ar)
        reasons = [{"reason": r["reason"], "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_by_reason", {"reasons": reasons}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS BY HOUR ====================

def cache_appointments_by_hour(period):
    conn, cur = get_db()
    try:
        w_ah, p_ah = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*) as count FROM dentally_appointments WHERE {w_ah} GROUP BY hour ORDER BY hour", p_ah)
        hours = [{"hour": r["hour"], "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_by_hour", {"hours": hours}, period)
    finally:
        conn.close()


# ==================== APPOINTMENTS BY DAY ====================

def cache_appointments_by_day(period):
    conn, cur = get_db()
    try:
        w_ad, p_ad = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"SELECT TO_CHAR(start_time, 'Day') as day, COUNT(*) as count FROM dentally_appointments WHERE {w_ad} GROUP BY day ORDER BY MIN(EXTRACT(DOW FROM start_time))", p_ad)
        days = [{"day": r["day"].strip(), "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_by_day", {"days": days}, period)
    finally:
        conn.close()


# ==================== CANCELLATIONS BY DAY OF WEEK ====================

def cache_appointments_cancellation_by_day(period):
    conn, cur = get_db()
    try:
        w_cd, p_cd = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"""
            SELECT TO_CHAR(start_time, 'Day') as day,
                   COUNT(*) as total,
                   COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
                   ROUND(COUNT(*) FILTER (WHERE status = 'Cancelled') * 100.0 / GREATEST(COUNT(*), 1), 1) as rate
            FROM dentally_appointments
            WHERE {w_cd}
            GROUP BY day
            ORDER BY MIN(EXTRACT(DOW FROM start_time))
        """, p_cd)
        days = [{"day": r["day"].strip(), "total": r["total"], "cancelled": r["cancelled"], "rate": r["rate"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_cancellation_by_day", {"days": days}, period)
    finally:
        conn.close()


# ==================== APPOINTMENT LIFECYCLE (duration by hour) ====================

def cache_appointments_lifecycle(period):
    conn, cur = get_db()
    try:
        w_lc, p_lc = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"""
            SELECT EXTRACT(HOUR FROM start_time)::int as hour,
                   ROUND(MIN(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as min_min,
                   ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as avg_min,
                   ROUND(MAX(EXTRACT(EPOCH FROM (completed_at - start_time)) / 60), 1) as max_min,
                   COUNT(*) as count
            FROM dentally_appointments
            WHERE {w_lc} AND completed_at IS NOT NULL 
              AND start_time IS NOT NULL
            GROUP BY hour
            ORDER BY hour
        """, p_lc)
        hours = [{"hour": r["hour"], "min": r["min_min"], "avg": r["avg_min"], "max": r["max_min"], "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_lifecycle", {"hours": hours}, period)
    finally:
        conn.close()


# ==================== APPOINTMENT ACTUAL DURATION ====================

def cache_appointments_duration(period):
    conn, cur = get_db()
    try:
        w_du, p_du = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"""
            SELECT
                CASE
                    WHEN completed_at - start_time <= INTERVAL '15 minutes' THEN '<15 min'
                    WHEN completed_at - start_time <= INTERVAL '30 minutes' THEN '15-30 min'
                    WHEN completed_at - start_time <= INTERVAL '45 minutes' THEN '30-45 min'
                    WHEN completed_at - start_time <= INTERVAL '60 minutes' THEN '45-60 min'
                    ELSE '60+ min'
                END as bucket,
                COUNT(*) as count
            FROM dentally_appointments
            WHERE {w_du} AND completed_at IS NOT NULL 
              AND start_time IS NOT NULL
            GROUP BY bucket
            ORDER BY MIN(completed_at - start_time)
        """, p_du)
        buckets = [{"bucket": r["bucket"], "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_appointments_duration", {"buckets": buckets}, period)
    finally:
        conn.close()


# ==================== APPOINTMENT DAY-HOUR HEATMAP ====================

def cache_appointments_heatmap(period):
    conn, cur = get_db()
    try:
        w_hm, p_hm = build_date_clause(period, column_expr=ts("start_time"))
        cur.execute(f"""
            SELECT TO_CHAR(start_time, 'Day') as day_name,
                   EXTRACT(HOUR FROM start_time)::int as hour,
                   COUNT(*) as count
            FROM dentally_appointments
            WHERE {w_hm}
            GROUP BY day_name, hour
            ORDER BY MIN(EXTRACT(DOW FROM start_time)), hour
        """, p_hm)
        heatmap = []
        current_day = None
        for r in cur.fetchall():
            dn = r["day_name"].strip()
            if dn != current_day:
                heatmap.append({"day": dn, "data": []})
                current_day = dn
            heatmap[-1]["data"].append({"hour": r["hour"], "count": r["count"]})
        save_cache("dashboard_appointments_heatmap", {"heatmap": heatmap}, period)
    finally:
        conn.close()


# ==================== APPOINTMENT MONTHLY TREND ====================

# ==================== TREATMENT PLAN KPIs ====================

def cache_treatment_plan_kpis(period):
    conn, cur = get_db()
    try:
        w_tp, p_tp = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT COUNT(*) as total_plans, SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_plans, SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_plans, SUM(CASE WHEN LOWER(status) = 'proposed' THEN 1 ELSE 0 END) as proposed_plans, COALESCE(SUM(nhs_uda_value), 0) as total_nhs_uda_value, COALESCE(SUM(nhs_completed_uda_value), 0) as completed_nhs_uda_value, COALESCE(SUM(private_treatment_value), 0) as total_private_value FROM dentally_treatment_plans WHERE {w_tp}", p_tp)
        stats = cur.fetchone()
        w_ai, p_ai = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT COALESCE(AVG(price), 0) as avg_item_price FROM dentally_treatment_plan_items WHERE {w_ai}", p_ai)
        avg_item = cur.fetchone()
        total = stats["total_plans"] or 0
        completed = stats["completed_plans"] or 0
        save_cache("dashboard_treatment_plan_kpis", {
            "totalPlans": total, "completedPlans": completed, "activePlans": stats["active_plans"] or 0,
            "proposedPlans": stats["proposed_plans"] or 0,
            "completionRate": round(completed / total * 100, 1) if total > 0 else 0,
            "totalNhsUdaValue": float(stats["total_nhs_uda_value"] or 0),
            "completedNhsUdaValue": float(stats["completed_nhs_uda_value"] or 0),
            "totalPrivateValue": float(stats["total_private_value"] or 0),
            "avgItemPrice": round(float(avg_item["avg_item_price"] or 0), 2),
        }, period)
    finally:
        conn.close()


# ==================== TREATMENT PLANS BY PRACTITIONER ====================

def cache_treatment_plans_by_practitioner(period):
    conn, cur = get_db()
    try:
        w_tpp, p_tpp = build_date_clause(period, column_expr=ts("tp.created_at"))
        cur.execute(f"SELECT p.dentally_id as practitioner_id, COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as practitioner_name, p.role, COUNT(DISTINCT tp.id) as total_plans, COUNT(DISTINCT CASE WHEN tp.completed = true THEN tp.id END) as completed_plans, COALESCE(SUM(tp.nhs_uda_value), 0) as nhs_uda_value, COALESCE(SUM(tp.private_treatment_value), 0) as private_value, COALESCE(SUM(tpi.price), 0) as items_value FROM dentally_practitioners p LEFT JOIN dentally_treatment_plans tp ON tp.practitioner_id = p.dentally_id AND {w_tpp} LEFT JOIN dentally_treatment_plan_items tpi ON tpi.treatment_plan_id = tp.dentally_id WHERE p.active = true GROUP BY p.dentally_id, p.first_name, p.last_name, p.role ORDER BY total_plans DESC LIMIT 15", p_tpp)
        practitioners = []
        for row in cur.fetchall():
            practitioners.append({
                "practitionerId": row["practitioner_id"], "practitionerName": row["practitioner_name"],
                "role": row["role"], "totalPlans": row["total_plans"], "completedPlans": row["completed_plans"],
                "completionRate": round(row["completed_plans"] / row["total_plans"] * 100, 1) if row["total_plans"] > 0 else 0,
                "nhsUdaValue": float(row["nhs_uda_value"] or 0), "privateValue": float(row["private_value"] or 0),
                "itemsValue": float(row["items_value"] or 0),
            })
        save_cache("dashboard_treatment_plans_by_practitioner", {"practitioners": practitioners}, period)
    finally:
        conn.close()


# ==================== TREATMENT PLAN ITEMS ====================

def cache_treatment_plan_items(period):
    conn, cur = get_db()
    try:
        w_tpi, p_tpi = build_date_clause(period, column_expr=ts("tpi.created_at"))
        cur.execute(f"SELECT tpi.id, tpi.nomenclature, tpi.price as price, COALESCE(tpi.completed = true, false) as completed, tpi.completed_at as completed_at, tpi.created_at as created_at, tpi.duration as duration, tpi.uda_band, COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as patient_name, COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown') as practitioner_name, tp.status as plan_status, tp.dentally_id as plan_ref FROM dentally_treatment_plan_items tpi LEFT JOIN dentally_patients p ON p.dentally_id = NULLIF(tpi.patient_id, '') LEFT JOIN dentally_practitioners pr ON pr.dentally_id = NULLIF(tpi.practitioner_id, '') LEFT JOIN dentally_treatment_plans tp ON tp.dentally_id = tpi.treatment_plan_id WHERE {w_tpi} ORDER BY tpi.created_at DESC NULLS LAST LIMIT 20", p_tpi)
        items = []
        for row in cur.fetchall():
            items.append({
                "id": row["id"], "nomenclature": row["nomenclature"], "price": float(row["price"] or 0),
                "completed": row["completed"],
                "completedAt": row["completed_at"].strftime("%Y-%m-%d") if row["completed_at"] else None,
                "createdAt": row["created_at"].strftime("%Y-%m-%d") if row["created_at"] else None,
                "duration": row["duration"], "udaBand": row["uda_band"],
                "patientName": row["patient_name"], "practitionerName": row["practitioner_name"],
                "planStatus": row["plan_status"], "planRef": row["plan_ref"],
            })
        save_cache("dashboard_treatment_plan_items", {"items": items}, period)
    finally:
        conn.close()


# ==================== TREATMENT PLANS BY TREATMENT ====================

def cache_treatment_plans_by_treatment(period):
    conn, cur = get_db()
    try:
        w_bt, p_bt = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"""
            SELECT
                COALESCE(NULLIF(nomenclature, ''), 'Unknown') as treatment_name,
                COUNT(*) as count
            FROM dentally_treatment_plan_items
            WHERE {w_bt}
            GROUP BY treatment_name
            ORDER BY count DESC
            LIMIT 20
        """, p_bt)
        treatments = [{"name": r["treatment_name"], "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_treatment_plans_by_treatment", {"treatments": treatments}, period)
    finally:
        conn.close()


# ==================== TREATMENT PLAN TRENDS ====================

def cache_treatment_plan_trends(period):
    conn, cur = get_db()
    try:
        w_tp, p_tp = build_date_clause(period, column_expr=ts("created_at"))
        cur.execute(f"SELECT TO_CHAR(created_at::date, 'YYYY-MM') as month, COUNT(*) as plans_created, SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as plans_completed, COALESCE(SUM(nhs_uda_value), 0) as nhs_value, COALESCE(SUM(private_treatment_value), 0) as private_value FROM dentally_treatment_plans WHERE {w_tp} GROUP BY TO_CHAR(created_at::date, 'YYYY-MM') ORDER BY month ASC", p_tp)
        trends = [{"month": r["month"], "plansCreated": r["plans_created"], "plansCompleted": r["plans_completed"], "nhsValue": float(r["nhs_value"] or 0), "privateValue": float(r["private_value"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_treatment_plan_trends", {"trends": trends}, period)
    finally:
        conn.close()


# ==================== TREATMENT TRENDS (Invoices) ====================

def cache_treatment_trends(period):
    conn, cur = get_db()
    try:
        w_tt, p_tt = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT TO_CHAR(i.dated_on::date, 'YYYY-MM') as month, ii.name as treatment_name, SUM(ii.total_price::numeric) as monthly_revenue, COUNT(*) as count FROM dentally_invoice_items ii JOIN dentally_invoices i ON ii.invoice_id = i.dentally_id WHERE {w_tt} GROUP BY TO_CHAR(i.dated_on::date, 'YYYY-MM'), ii.name ORDER BY month DESC, monthly_revenue DESC LIMIT 100", p_tt)
        trends = [{"month": r["month"], "treatmentName": r["treatment_name"], "revenue": float(r["monthly_revenue"] or 0), "count": r["count"]} for r in cur.fetchall()]
        save_cache("dashboard_treatment_trends", {"trends": trends}, period)
    finally:
        conn.close()


# ==================== REVENUE BY TREATMENT ====================

def cache_revenue_by_treatment(period):
    conn, cur = get_db()
    try:
        w_rt, p_rt = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT ii.name as treatment_name, COUNT(*) as times_performed, SUM(ii.total_price::numeric) as total_revenue, AVG(ii.total_price::numeric) as avg_price, SUM(ii.quantity::numeric) as total_units, 0 as previous_revenue FROM dentally_invoice_items ii JOIN dentally_invoices i ON ii.invoice_id = i.dentally_id WHERE {w_rt} GROUP BY ii.name ORDER BY total_revenue DESC LIMIT 15", p_rt)
        treatments = [{"name": r["treatment_name"], "timesPerformed": r["times_performed"], "totalRevenue": float(r["total_revenue"] or 0), "avgPrice": float(r["avg_price"] or 0), "totalUnits": int(r["total_units"] or 0), "previousRevenue": float(r["previous_revenue"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_revenue_by_treatment", {"treatments": treatments}, period)
    finally:
        conn.close()


# ==================== TREATMENT FREQUENCY ====================

def cache_treatment_frequency(period):
    conn, cur = get_db()
    try:
        w_tf, p_tf = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT ii.name as treatment_name, COUNT(*) as frequency, SUM(ii.quantity::numeric) as total_units, SUM(ii.total_price::numeric) as total_revenue FROM dentally_invoice_items ii JOIN dentally_invoices i ON ii.invoice_id = i.dentally_id WHERE {w_tf} GROUP BY ii.name ORDER BY frequency DESC LIMIT 12", p_tf)
        treatments = [{"name": r["treatment_name"], "frequency": r["frequency"], "totalUnits": int(r["total_units"] or 0), "totalRevenue": float(r["total_revenue"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_treatment_frequency", {"treatments": treatments}, period)
    finally:
        conn.close()


# ==================== TREATMENT MIX BY PRACTICE ====================

def cache_treatment_mix_by_practice(period):
    conn, cur = get_db()
    try:
        w_tm, p_tm = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT s.name as practice, ii.name as treatment, COUNT(*) as count, SUM(ii.total_price::numeric) as revenue FROM dentally_invoice_items ii JOIN dentally_invoices i ON ii.invoice_id = i.dentally_id JOIN dentally_sites s ON i.site_id = s.id::text WHERE {w_tm} AND s.active = 1 GROUP BY s.name, ii.name ORDER BY s.name, revenue DESC LIMIT 50", p_tm)
        data = [{"practice": r["practice"], "treatment": r["treatment"], "count": r["count"], "revenue": float(r["revenue"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_treatment_mix_by_practice", {"data": data}, period)
    finally:
        conn.close()


# ==================== REVENUE BY ACCOUNT ====================

def cache_revenue_by_account(period):
    conn, cur = get_db()
    try:
        w_ra, p_ra = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT COALESCE(i.account_id, 'Unassigned') as account_id, COUNT(*) as invoice_count, SUM(i.amount::numeric) as total_revenue, AVG(i.amount::numeric) as avg_invoice_value, SUM(i.amount_outstanding::numeric) as total_outstanding FROM dentally_invoices i WHERE {w_ra} GROUP BY COALESCE(i.account_id, 'Unassigned') ORDER BY total_revenue DESC LIMIT 20", p_ra)
        accounts = [{"accountId": r["account_id"], "invoiceCount": r["invoice_count"], "totalRevenue": float(r["total_revenue"] or 0), "avgInvoiceValue": float(r["avg_invoice_value"] or 0), "totalOutstanding": float(r["total_outstanding"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_revenue_by_account", {"accounts": accounts}, period)
    finally:
        conn.close()


# ==================== OUTSTANDING BY ACCOUNT ====================

def cache_outstanding_by_account(period):
    conn, cur = get_db()
    try:
        w_oa, p_oa = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT COALESCE(i.account_id, 'Unassigned') as account_id, SUM(i.amount_outstanding::numeric) as total_outstanding, SUM(i.amount::numeric) as total_billed, COUNT(*) as invoice_count, ROUND(SUM(i.amount_outstanding::numeric) / NULLIF(SUM(i.amount::numeric), 0) * 100, 2) as outstanding_pct FROM dentally_invoices i WHERE {w_oa} AND i.amount_outstanding > 0 GROUP BY COALESCE(i.account_id, 'Unassigned') ORDER BY total_outstanding DESC LIMIT 15", p_oa)
        accounts = [{"accountId": r["account_id"], "totalOutstanding": float(r["total_outstanding"] or 0), "totalBilled": float(r["total_billed"] or 0), "invoiceCount": r["invoice_count"], "outstandingPct": float(r["outstanding_pct"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_outstanding_by_account", {"accounts": accounts}, period)
    finally:
        conn.close()


# ==================== TOP PATIENTS BY REVENUE ====================

def cache_top_patients_by_revenue(period):
    conn, cur = get_db()
    try:
        w_tp, p_tp = build_date_clause(period, column_expr=ts("i.created_at"))
        cur.execute(f"SELECT p.dentally_id as patient_id, COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Patient') as patient_name, COUNT(DISTINCT i.id) as invoice_count, SUM(i.amount::numeric) as total_revenue, AVG(i.amount::numeric) as avg_invoice_value, MAX({ts('i.created_at')}) as last_visit, 0 as previous_revenue FROM dentally_patients p LEFT JOIN dentally_invoices i ON i.patient_id = p.dentally_id AND {w_tp} WHERE p.active = 1 GROUP BY p.dentally_id, p.first_name, p.last_name HAVING SUM(i.amount::numeric) > 0 ORDER BY total_revenue DESC LIMIT 5", p_tp)
        patients = []
        for row in cur.fetchall():
            lv = row["last_visit"]
            lv_str = lv.strftime("%d %b %Y") if lv and hasattr(lv, "strftime") else (str(lv)[:10] if lv else "N/A")
            patients.append({
                "patientId": row["patient_id"], "patientName": row["patient_name"],
                "invoiceCount": row["invoice_count"] or 0, "totalRevenue": float(row["total_revenue"] or 0),
                "avgInvoiceValue": float(row["avg_invoice_value"] or 0), "lastVisit": lv_str,
                "previousRevenue": float(row["previous_revenue"] or 0),
            })
        save_cache("dashboard_top_patients_by_revenue", {"patients": patients}, period)
    finally:
        conn.close()


# ==================== INVOICE KPIs DATEDON ====================

def cache_invoices_kpis_datedon(period):
    conn, cur = get_db()
    try:
        w_ikd, p_ikd = build_date_clause(period, "dated_on")
        cur.execute(f"SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM dentally_invoices WHERE {w_ikd}", p_ikd)
        inv = cur.fetchone()
        total_inv = inv["total"] or 0
        total_amt = float(inv["total_amount"] or 0)
        cur.execute(f"SELECT COALESCE(SUM(amount_outstanding), 0) as outstanding FROM dentally_invoices WHERE {w_ikd} AND amount_outstanding > 0", p_ikd)
        outstanding = float(cur.fetchone()["outstanding"] or 0)
        cur.execute(f"SELECT COUNT(*) as paid_count, COALESCE(SUM(amount), 0) as paid_amount FROM dentally_invoices WHERE {w_ikd} AND paid = true", p_ikd)
        paid = cur.fetchone()
        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as total_revenue FROM dentally_invoices WHERE {w_ikd}", p_ikd)
        total_rev = float(cur.fetchone()["total_revenue"] or 0)
        avg_value = total_amt / total_inv if total_inv > 0 else 0
        coll_rate = ((total_amt - outstanding) / total_amt * 100) if total_amt > 0 else 0
        save_cache("dashboard_invoices_kpis_datedon", {
            "totalInvoices": total_inv, "totalRevenue": round(total_amt, 2),
            "outstanding": round(outstanding, 2), "paidInvoices": paid["paid_count"] or 0,
            "paidAmount": round(float(paid["paid_amount"] or 0), 2),
            "avgInvoiceValue": round(avg_value, 2), "collectionRate": round(coll_rate, 1),
        }, period)
    finally:
        conn.close()


# ==================== INVOICE TREND DATEDON ====================

def cache_invoices_trend_datedon(period):
    conn, cur = get_db()
    try:
        period_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 365}
        days = period_map.get(period, 30)
        if period == "today":
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)]
        elif period in ("7d", "30d", "90d"):
            date_points = [datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i) for i in range(days - 1, -1, -1)]
        else:
            date_points = [datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30 * i) for i in range(11, -1, -1)]
        chart_data = []
        for date in date_points:
            date_str = date.strftime("%Y-%m-%d")
            date_label = date.strftime("%d %b") if period in ("today", "7d", "30d", "90d") else date.strftime("%b %Y")
            cur.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, COALESCE(SUM(CASE WHEN paid = true THEN amount ELSE 0 END), 0) as paid FROM dentally_invoices WHERE dated_on = %s", (date_str,))
            row = cur.fetchone()
            total = float(row["total"] or 0)
            paid = float(row["paid"] or 0)
            chart_data.append({"date": date_label, "count": row["count"] or 0, "total": total, "paid": paid, "outstanding": total - paid})
        save_cache("dashboard_invoices_trend_datedon", {"chart_data": chart_data}, period)
    finally:
        conn.close()


# ==================== REVENUE BY SITE DATEDON ====================

def cache_revenue_by_site_datedon(period):
    conn, cur = get_db()
    try:
        w_rsd, p_rsd = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT s.name as site_name, COALESCE(SUM(i.amount), 0) as revenue, COUNT(DISTINCT i.id) as invoice_count FROM dentally_sites s LEFT JOIN dentally_invoices i ON s.id::text = i.site_id AND {w_rsd} WHERE s.active = 1 GROUP BY s.id, s.name ORDER BY revenue DESC", p_rsd)
        sites = [{"name": r["site_name"], "revenue": float(r["revenue"] or 0), "invoices": r["invoice_count"] or 0} for r in cur.fetchall()]
        save_cache("dashboard_revenue_by_site_datedon", {"sites": sites}, period)
    finally:
        conn.close()


# ==================== TOP PATIENTS BY REVENUE DATEDON ====================

def cache_top_patients_by_revenue_datedon(period):
    conn, cur = get_db()
    try:
        w_tpd, p_tpd = build_date_clause(period, dt("i.dated_on"))
        cur.execute(f"SELECT p.dentally_id as patient_id, COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Patient') as patient_name, COUNT(DISTINCT i.id) as invoice_count, SUM(i.amount::numeric) as total_revenue, AVG(i.amount::numeric) as avg_invoice_value, MAX({dt('i.dated_on')}) as last_visit, 0 as previous_revenue FROM dentally_patients p LEFT JOIN dentally_invoices i ON i.patient_id = p.dentally_id AND {w_tpd} WHERE p.active = 1 GROUP BY p.dentally_id, p.first_name, p.last_name HAVING SUM(i.amount::numeric) > 0 ORDER BY total_revenue DESC LIMIT 5", p_tpd)
        patients = []
        for row in cur.fetchall():
            lv = row["last_visit"]
            lv_str = lv.strftime("%d %b %Y") if lv and hasattr(lv, "strftime") else (str(lv)[:10] if lv else "N/A")
            patients.append({
                "patientId": row["patient_id"], "patientName": row["patient_name"],
                "invoiceCount": row["invoice_count"] or 0, "totalRevenue": float(row["total_revenue"] or 0),
                "avgInvoiceValue": float(row["avg_invoice_value"] or 0), "lastVisit": lv_str,
                "previousRevenue": float(row["previous_revenue"] or 0),
            })
        save_cache("dashboard_top_patients_by_revenue_datedon", {"patients": patients}, period)
    finally:
        conn.close()


# ==================== PAYMENTS ====================

def cache_payments_kpis(period):
    conn, cur = get_db()
    try:
        w_pk, p_pk = build_date_clause(period, dt("dated_on"))
        cur.execute(f"SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM dentally_payments WHERE {w_pk}", p_pk)
        s = cur.fetchone()
        cur.execute(f"SELECT ROUND(AVG(amount)::numeric, 2) as avg FROM dentally_payments WHERE {w_pk}", p_pk)
        avg = float(cur.fetchone()["avg"] or 0)
        cur.execute(f"SELECT method, COUNT(*) as cnt FROM dentally_payments WHERE {w_pk} AND method IS NOT NULL AND method != '' GROUP BY method ORDER BY cnt DESC LIMIT 1", p_pk)
        top = cur.fetchone()
        cur.execute(f"SELECT COUNT(*) as c FROM dentally_payments WHERE {w_pk} AND LOWER(method) = 'cash'", p_pk)
        cash = cur.fetchone()["c"] or 0
        cur.execute(f"SELECT COUNT(*) as c FROM dentally_payments WHERE {w_pk} AND LOWER(method) IN ('debit card', 'credit card')", p_pk)
        card = cur.fetchone()["c"] or 0
        cur.execute(f"SELECT COALESCE(SUM(amount_unexplained), 0) as ue FROM dentally_payments WHERE {w_pk}", p_pk)
        ue = float(cur.fetchone()["ue"] or 0)
        save_cache("dashboard_payments_kpis", {
            "totalPayments": s["total"] or 0, "totalAmount": round(float(s["total_amount"] or 0), 2),
            "avgPayment": avg, "topMethod": top["method"] if top else "N/A",
            "cashCount": cash, "cardCount": card, "unexplained": round(ue, 2),
        }, period)
    finally:
        conn.close()


def cache_payments_trend(period):
    conn, cur = get_db()
    try:
        w_pt, p_pt = build_date_clause(period, dt("dated_on"))
        if period in ("today", "7d", "30d", "90d"):
            cur.execute(f"SELECT dated_on as day, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM dentally_payments WHERE {w_pt} GROUP BY day ORDER BY day", p_pt)
        else:
            cur.execute(f"SELECT TO_CHAR(dated_on, 'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM dentally_payments WHERE {w_pt} GROUP BY month ORDER BY month", p_pt)
        chart = []
        for r in cur.fetchall():
            d = r.get("day") or r.get("month") or ""
            label = d.strftime("%d %b") if hasattr(d, "strftime") else str(d)
            chart.append({"date": label, "count": r["count"] or 0, "total": float(r["total"] or 0)})
        save_cache("dashboard_payments_trend", {"chart_data": chart}, period)
    finally:
        conn.close()


def cache_payments_by_method(period):
    conn, cur = get_db()
    try:
        w_pm, p_pm = build_date_clause(period, dt("dated_on"))
        cur.execute(f"SELECT COALESCE(NULLIF(method, ''), 'Unknown') as method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM dentally_payments WHERE {w_pm} GROUP BY method ORDER BY total DESC", p_pm)
        methods = [{"method": r["method"], "count": r["count"] or 0, "total": float(r["total"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_payments_by_method", {"methods": methods}, period)
    finally:
        conn.close()


def cache_payments_by_site(period):
    conn, cur = get_db()
    try:
        w_ps, p_ps = build_date_clause(period, dt("p.dated_on"))
        cur.execute(f"SELECT COALESCE(s.name, 'Unknown') as site_name, COUNT(*) as payment_count, COALESCE(SUM(p.amount), 0) as total FROM dentally_payments p LEFT JOIN dentally_sites s ON s.dentally_id = p.site_id WHERE {w_ps} GROUP BY s.name ORDER BY total DESC", p_ps)
        sites = [{"name": r["site_name"], "count": r["payment_count"] or 0, "total": float(r["total"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_payments_by_site", {"sites": sites}, period)
    finally:
        conn.close()


def cache_payments_by_practitioner(period):
    conn, cur = get_db()
    try:
        w_pp, p_pp = build_date_clause(period, dt("p.dated_on"))
        cur.execute(f"SELECT p.practitioner_id, COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown') as practitioner_name, COUNT(*) as payment_count, COALESCE(SUM(p.amount), 0) as total FROM dentally_payments p LEFT JOIN dentally_practitioners pr ON pr.dentally_id = p.practitioner_id WHERE {w_pp} GROUP BY p.practitioner_id, pr.first_name, pr.last_name ORDER BY total DESC LIMIT 15", p_pp)
        practitioners = [{"id": r["practitioner_id"], "name": r["practitioner_name"], "count": r["payment_count"] or 0, "total": float(r["total"] or 0)} for r in cur.fetchall()]
        save_cache("dashboard_payments_by_practitioner", {"practitioners": practitioners}, period)
    finally:
        conn.close()


def cache_recent_payments(period):
    conn, cur = get_db()
    try:
        w_rp, p_rp = build_date_clause(period, dt("p.dated_on"))
        cur.execute(f"SELECT p.id, p.dentally_id, p.amount, p.method, p.dated_on, p.reference, p.transaction_number, COALESCE(pt.first_name || ' ' || pt.last_name, 'Unknown') as patient_name, COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown') as practitioner_name, COALESCE(s.name, 'Unknown') as site_name FROM dentally_payments p LEFT JOIN dentally_patients pt ON pt.dentally_id = p.patient_id LEFT JOIN dentally_practitioners pr ON pr.dentally_id = p.practitioner_id LEFT JOIN dentally_sites s ON s.dentally_id = p.site_id WHERE {w_rp} ORDER BY p.dated_on DESC, p.dentally_id DESC LIMIT 20", p_rp)
        payments = [{"id": r["id"], "ref": r["dentally_id"], "amount": float(r["amount"] or 0), "method": r["method"] or "Unknown", "datedOn": str(r["dated_on"] or "")[:10], "reference": r["reference"] or "", "transactionNumber": r["transaction_number"] or "", "patientName": r["patient_name"], "practitionerName": r["practitioner_name"], "siteName": r["site_name"]} for r in cur.fetchall()]
        save_cache("dashboard_recent_payments", {"payments": payments}, period)
    finally:
        conn.close()


# ==================== CONTRACTS ====================

def cache_contracts_list(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("c.start_date"))
        cur.execute(f"""
            SELECT c.*, s.name as site_name
            FROM dentally_contracts c
            LEFT JOIN dentally_sites s ON c.site_id = s.id::text
            WHERE {w}
            ORDER BY c.start_date DESC
        """, p)
        contracts = [{
            "id": r["id"], "name": r["name"], "contract_number": r["contract_number"],
            "start_date": str(r["start_date"]) if r["start_date"] else None,
            "end_date": str(r["end_date"]) if r["end_date"] else None,
            "uda_value": float(r["uda_value"] or 0), "uoa_value": float(r["uoa_value"] or 0),
            "target": float(r["target"] or 0), "uoa_target": float(r["uoa_target"] or 0),
            "site_id": r["site_id"], "site_name": r["site_name"], "active": r["active"],
            "pds_plus": r["pds_plus"], "notes": r["notes"],
            "created_at": str(r["created_at"]) if r["created_at"] else None,
        } for r in cur.fetchall()]
        save_cache("dashboard_contracts_list", {"contracts": contracts, "total": len(contracts)}, period)
    finally:
        conn.close()

def cache_contracts_kpis(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("start_date"))
        cur.execute(f"""
            SELECT COUNT(*) as total_contracts,
                   SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active_contracts,
                   SUM(target) as total_target, SUM(uoa_target) as total_uoa_target,
                   AVG(uda_value) as avg_uda_value, AVG(uoa_value) as avg_uoa_value,
                   SUM(CASE WHEN pds_plus = true THEN 1 ELSE 0 END) as pds_plus_count
            FROM dentally_contracts WHERE {w}
        """, p)
        row = cur.fetchone()
        save_cache("dashboard_contracts_kpis", {
            "total_contracts": row["total_contracts"] or 0,
            "active_contracts": row["active_contracts"] or 0,
            "total_target": float(row["total_target"] or 0),
            "total_uoa_target": float(row["total_uoa_target"] or 0),
            "avg_uda_value": round(float(row["avg_uda_value"] or 0), 2),
            "avg_uoa_value": round(float(row["avg_uoa_value"] or 0), 2),
            "pds_plus_count": row["pds_plus_count"] or 0,
        }, period)
    finally:
        conn.close()

def cache_contracts_by_site(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("c.start_date"))
        cur.execute(f"""
            SELECT COALESCE(s.name, 'Unknown') as site_name, COUNT(*) as contract_count,
                   SUM(CASE WHEN c.active = true THEN 1 ELSE 0 END) as active_count,
                   SUM(c.target) as total_target, SUM(c.uoa_target) as total_uoa_target,
                   AVG(c.uda_value) as avg_uda_value,
                   SUM(CASE WHEN c.pds_plus = true THEN 1 ELSE 0 END) as pds_plus_count
            FROM dentally_contracts c LEFT JOIN dentally_sites s ON c.site_id = s.id::text
            WHERE {w} GROUP BY s.name ORDER BY total_target DESC
        """, p)
        sites = [{
            "site_name": r["site_name"], "contract_count": r["contract_count"],
            "active_count": r["active_count"], "total_target": float(r["total_target"] or 0),
            "total_uoa_target": float(r["total_uoa_target"] or 0),
            "avg_uda_value": round(float(r["avg_uda_value"] or 0), 2),
            "pds_plus_count": r["pds_plus_count"] or 0,
        } for r in cur.fetchall()]
        save_cache("dashboard_contracts_by_site", {"sites": sites, "total": len(sites)}, period)
    finally:
        conn.close()

def cache_contracts_timeline(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("c.start_date"))
        cur.execute(f"""
            SELECT c.id, c.name, c.contract_number, c.start_date, c.end_date, c.active,
                   c.target, c.uda_value, c.uoa_value, c.uoa_target, c.pds_plus, s.name as site_name
            FROM dentally_contracts c LEFT JOIN dentally_sites s ON c.site_id = s.id::text
            WHERE {w} ORDER BY c.start_date
        """, p)
        today = datetime.now().date()
        timeline = []
        for r in cur.fetchall():
            dur = (r["end_date"] - r["start_date"]).days if r["start_date"] and r["end_date"] else 0
            prog = 0
            if r["start_date"] and r["end_date"] and dur > 0:
                if today < r["start_date"]: prog = 0
                elif today > r["end_date"]: prog = 100
                else: prog = round((today - r["start_date"]).days / dur * 100, 1)
            timeline.append({
                "id": r["id"], "name": r["name"], "contract_number": r["contract_number"],
                "start_date": str(r["start_date"]) if r["start_date"] else None,
                "end_date": str(r["end_date"]) if r["end_date"] else None,
                "duration_days": dur, "progress": prog, "active": r["active"],
                "target": float(r["target"] or 0), "uda_value": float(r["uda_value"] or 0),
                "site_name": r["site_name"], "pds_plus": r["pds_plus"],
            })
        save_cache("dashboard_contracts_timeline", {"timeline": timeline, "total": len(timeline)}, period)
    finally:
        conn.close()

def cache_contracts_uda_delivery(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("c.start_date"))
        try:
            cur.execute(f"""
                SELECT c.name, c.contract_number, c.target, c.uda_value, c.uoa_target, c.uoa_value,
                       c.start_date, c.end_date, c.active, c.pds_plus,
                       COALESCE(s.name, c.site_id) as site_name,
                       COALESCE(SUM(CASE WHEN nc.status = 'delivered' THEN 1 ELSE 0 END), 0) as uda_delivered,
                       COALESCE(SUM(CASE WHEN nc.status = 'claimed' THEN 1 ELSE 0 END), 0) as uda_claimed
                FROM dentally_contracts c
                LEFT JOIN dentally_sites s ON c.site_id = s.id::text
                LEFT JOIN dentally_nhs_claims nc ON nc.contract_id = c.id::text
                WHERE {w} GROUP BY c.id, c.name, c.contract_number, c.target, c.uda_value, c.uoa_target,
                                  c.uoa_value, c.start_date, c.end_date, c.active, c.pds_plus, s.name, s.id
                ORDER BY c.name
            """, p)
        except Exception:
            conn.rollback()
            try:
                cur.execute(f"""
                    SELECT c.name, c.contract_number, c.target, c.uda_value, c.uoa_target, c.uoa_value,
                           c.start_date, c.end_date, c.active, c.pds_plus,
                           COALESCE(s.name, c.site_id) as site_name
                    FROM dentally_contracts c
                    LEFT JOIN dentally_sites s ON c.site_id = s.id::text
                    WHERE {w} ORDER BY c.name
                """, p)
            except Exception:
                save_cache("dashboard_contracts_uda_delivery", {
                    "contracts": [], "total_target": 0, "total_delivered": 0,
                    "overall_delivery_rate": 0, "total": 0
                }, period)
                return
        total_target = 0
        total_delivered = 0
        delivery_data = []
        for r in cur.fetchall():
            tgt = float(r["target"] or 0)
            delv = float(r.get("uda_delivered", 0) or 0)
            total_target += tgt
            total_delivered += delv
            delivery_data.append({
                "name": r["name"], "contract_number": r["contract_number"],
                "site_name": r.get("site_name", r.get("site_id", "")), "target": tgt,
                "uda_value": float(r["uda_value"] or 0),
                "uoa_target": float(r["uoa_target"] or 0),
                "uoa_value": float(r["uoa_value"] or 0),
                "uda_delivered": delv, "uda_claimed": float(r.get("uda_claimed", 0) or 0),
                "delivery_rate": round(delv / tgt * 100, 1) if tgt > 0 else 0,
                "remaining": max(0, tgt - delv), "active": r["active"], "pds_plus": r["pds_plus"],
            })
        overall_rate = round(total_delivered / total_target * 100, 1) if total_target > 0 else 0
        save_cache("dashboard_contracts_uda_delivery", {
            "contracts": delivery_data, "total_target": total_target,
            "total_delivered": total_delivered, "overall_delivery_rate": overall_rate,
            "total": len(delivery_data)
        }, period)
    finally:
        conn.close()

def cache_contracts_value_distribution(period):
    conn, cur = get_db()
    try:
        w, p = build_date_clause(period, dt("start_date"))
        cur.execute(f"""
            SELECT uda_value, COUNT(*) as contract_count, SUM(target) as total_target,
                   SUM(uoa_target) as total_uoa_target
            FROM dentally_contracts WHERE {w}
            GROUP BY uda_value ORDER BY uda_value
        """, p)
        dist = [{
            "uda_value": float(r["uda_value"] or 0), "contract_count": r["contract_count"],
            "total_target": float(r["total_target"] or 0),
            "total_uoa_target": float(r["total_uoa_target"] or 0),
        } for r in cur.fetchall()]
        save_cache("dashboard_contracts_value_distribution", {"distribution": dist}, period)
    finally:
        conn.close()


# ==================== MAIN ====================

PERIODIC_ENDPOINTS = [
    ("dashboard_metrics", cache_dashboard_metrics),
    ("dashboard_ai_insights", cache_ai_insights),
    ("dashboard_health_score", cache_health_score),
    ("dashboard_league", cache_league),
    ("dashboard_finance_metrics", cache_finance_metrics),
    ("dashboard_revenue_by_stream", cache_revenue_by_stream),
    ("dashboard_invoices_kpis", cache_invoices_kpis),
    ("dashboard_invoices_trend", cache_invoices_trend),
    ("dashboard_revenue_by_site", cache_revenue_by_site),
    ("dashboard_clinicians_league", cache_clinicians_league),
    ("dashboard_operations_kpis", cache_operations_kpis),
    ("dashboard_case_acceptance", cache_case_acceptance),
    ("dashboard_hygiene_utilization", cache_hygiene_utilization),
    ("dashboard_practice_league", cache_practice_league),
    ("dashboard_appointments_kpis", cache_appointments_kpis),
    ("dashboard_appointments_trend", cache_appointments_trend),
    ("dashboard_appointments_by_site", cache_appointments_by_site),
    ("dashboard_appointments_by_practitioner", cache_appointments_by_practitioner),
    ("dashboard_recent_appointments", cache_recent_appointments),
    ("dashboard_treatment_plan_kpis", cache_treatment_plan_kpis),
    ("dashboard_treatment_plans_by_practitioner", cache_treatment_plans_by_practitioner),
    ("dashboard_treatment_plan_items", cache_treatment_plan_items),
    ("dashboard_treatment_plans_by_treatment", cache_treatment_plans_by_treatment),
    ("dashboard_treatment_plan_trends", cache_treatment_plan_trends),
    ("dashboard_treatment_trends", cache_treatment_trends),
    ("dashboard_revenue_by_treatment", cache_revenue_by_treatment),
    ("dashboard_treatment_frequency", cache_treatment_frequency),
    ("dashboard_treatment_mix_by_practice", cache_treatment_mix_by_practice),
    ("dashboard_revenue_by_account", cache_revenue_by_account),
    ("dashboard_outstanding_by_account", cache_outstanding_by_account),
    ("dashboard_top_patients_by_revenue", cache_top_patients_by_revenue),
    ("dashboard_invoices_kpis_datedon", cache_invoices_kpis_datedon),
    ("dashboard_invoices_trend_datedon", cache_invoices_trend_datedon),
    ("dashboard_revenue_by_site_datedon", cache_revenue_by_site_datedon),
    ("dashboard_top_patients_by_revenue_datedon", cache_top_patients_by_revenue_datedon),
    ("dashboard_payments_kpis", cache_payments_kpis),
    ("dashboard_payments_trend", cache_payments_trend),
    ("dashboard_payments_by_method", cache_payments_by_method),
    ("dashboard_payments_by_site", cache_payments_by_site),
    ("dashboard_payments_by_practitioner", cache_payments_by_practitioner),
    ("dashboard_recent_payments", cache_recent_payments),
    ("dashboard_appointments_by_reason", cache_appointments_by_reason),
    ("dashboard_appointments_by_hour", cache_appointments_by_hour),
    ("dashboard_appointments_by_day", cache_appointments_by_day),
    ("dashboard_appointments_cancellation_by_day", cache_appointments_cancellation_by_day),
    ("dashboard_appointments_lifecycle", cache_appointments_lifecycle),
    ("dashboard_appointments_duration", cache_appointments_duration),
    ("dashboard_appointments_heatmap", cache_appointments_heatmap),
    ("dashboard_contracts_list", cache_contracts_list),
    ("dashboard_contracts_kpis", cache_contracts_kpis),
    ("dashboard_contracts_by_site", cache_contracts_by_site),
    ("dashboard_contracts_timeline", cache_contracts_timeline),
    ("dashboard_contracts_uda_delivery", cache_contracts_uda_delivery),
    ("dashboard_contracts_value_distribution", cache_contracts_value_distribution),
]

STATIC_ENDPOINTS = [
    ("dashboard_sites", cache_sites),
    ("dashboard_profit_per_practice", cache_profit_per_practice),
    ("dashboard_nhs_chart", cache_nhs_chart),
    ("dashboard_capacity_data", cache_capacity_data),
    ("dashboard_recall_backlog", cache_recall_backlog),
]

PAGE_ENDPOINTS = {
    "dashboard": ["dashboard_metrics", "dashboard_ai_insights", "dashboard_health_score", "dashboard_league", "dashboard_sites", "dashboard_nhs_chart"],
    "appointments": ["dashboard_appointments_kpis", "dashboard_appointments_trend", "dashboard_appointments_by_site", "dashboard_appointments_by_practitioner", "dashboard_recent_appointments", "dashboard_appointments_by_reason", "dashboard_appointments_by_hour", "dashboard_appointments_by_day", "dashboard_appointments_cancellation_by_day", "dashboard_appointments_lifecycle", "dashboard_appointments_duration", "dashboard_appointments_heatmap"],
    "invoices": ["dashboard_invoices_kpis", "dashboard_invoices_trend", "dashboard_revenue_by_site", "dashboard_revenue_by_treatment", "dashboard_top_patients_by_revenue", "dashboard_invoices_kpis_datedon", "dashboard_invoices_trend_datedon", "dashboard_revenue_by_site_datedon", "dashboard_top_patients_by_revenue_datedon", "dashboard_treatment_frequency", "dashboard_treatment_mix_by_practice", "dashboard_revenue_by_account", "dashboard_outstanding_by_account"],
    "treatment-plans": ["dashboard_treatment_plan_kpis", "dashboard_treatment_plans_by_practitioner", "dashboard_treatment_plan_items", "dashboard_treatment_plans_by_treatment", "dashboard_treatment_plan_trends", "dashboard_treatment_trends"],
    "clinicians": ["dashboard_clinicians_league", "dashboard_case_acceptance", "dashboard_hygiene_utilization"],
    "finance": ["dashboard_finance_metrics", "dashboard_revenue_by_stream", "dashboard_profit_per_practice"],
    "sales": ["dashboard_revenue_by_stream", "dashboard_case_acceptance", "dashboard_hygiene_utilization", "dashboard_operations_kpis"],
    "payments": ["dashboard_payments_kpis", "dashboard_payments_trend", "dashboard_payments_by_method", "dashboard_payments_by_site", "dashboard_payments_by_practitioner", "dashboard_recent_payments"],
    "operations": ["dashboard_operations_kpis", "dashboard_practice_league", "dashboard_capacity_data", "dashboard_recall_backlog"],
    "contracts": ["dashboard_contracts_list", "dashboard_contracts_kpis", "dashboard_contracts_by_site", "dashboard_contracts_timeline", "dashboard_contracts_uda_delivery", "dashboard_contracts_value_distribution"],
}


def get_endpoint_func(name):
    for n, f in PERIODIC_ENDPOINTS:
        if n == name:
            return f
    for n, f in STATIC_ENDPOINTS:
        if n == name:
            return f
    return None


def cache_page(page, periods=None):
    periods = periods or PERIODS
    names = PAGE_ENDPOINTS.get(page)
    if not names:
        print(f"Unknown page: {page}")
        return False
    total = 0
    errors = []
    print(f"\n=== Caching page '{page}' ===")
    for name in names:
        func = get_endpoint_func(name)
        if not func:
            errors.append(f"{name}: no matching function")
            continue
        # Check if it's a static endpoint
        is_static = any(n == name for n, _ in STATIC_ENDPOINTS)
        if is_static:
            print(f"  {name}...", end=" ")
            try:
                func()
                total += 1
                print("OK")
            except Exception as e:
                errors.append(f"{name}: {e}")
                print(f"ERROR: {e}")
        else:
            for period in periods:
                print(f"  [{period}] {name}...", end=" ")
                try:
                    func(period)
                    total += 1
                    print("OK")
                except Exception as e:
                    errors.append(f"{name}[{period}]: {e}")
                    print(f"ERROR: {e}")
    print(f"\n=== Done! {total} cache files for page '{page}' ===")
    if errors:
        print(f"\n=== {len(errors)} Errors ===")
        for e in errors:
            print(f"  - {e}")
        return False
    return True


def cache_all(periods=None):
    periods = periods or PERIODS
    total = 0
    errors = []

    print("\n=== Precomputing period-based endpoints ===")
    for name, func in PERIODIC_ENDPOINTS:
        for period in periods:
            print(f"  [{period}] {name}...", end=" ")
            try:
                func(period)
                total += 1
                print("OK")
            except Exception as e:
                errors.append(f"{name}[{period}]: {e}")
                print(f"ERROR: {e}")

    print("\n=== Precomputing static endpoints ===")
    for name, func in STATIC_ENDPOINTS:
        print(f"  {name}...", end=" ")
        try:
            func()
            total += 1
            print("OK")
        except Exception as e:
            errors.append(f"{name}: {e}")
            print(f"ERROR: {e}")

    print(f"\n=== Done! {total} cache files created ===")
    if errors:
        print(f"\n=== {len(errors)} Errors ===")
        for e in errors:
            print(f"  - {e}")
        return False
    return True


def list_cache():
    if not os.path.exists(CACHE_DIR):
        print("Cache directory is empty.")
        return
    files = sorted(os.listdir(CACHE_DIR))
    if not files:
        print("Cache directory is empty.")
        return
    print(f"Cache files ({len(files)} total):")
    for f in files:
        path = os.path.join(CACHE_DIR, f)
        size = os.path.getsize(path)
        mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M")
        print(f"  {f:55s} {size:>8,} bytes  {mtime}")


def clear_cache():
    if not os.path.exists(CACHE_DIR):
        print("Cache directory does not exist.")
        return
    count = 0
    for f in os.listdir(CACHE_DIR):
        os.remove(os.path.join(CACHE_DIR, f))
        count += 1
    print(f"Cleared {count} cache files.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Precompute dashboard data and cache as JSON")
    parser.add_argument("--period", help="Specific period to cache (e.g. 7d, 30d). Default: all periods")
    parser.add_argument("--list", action="store_true", help="List cached files")
    parser.add_argument("--clear", action="store_true", help="Clear all cached files")
    args = parser.parse_args()

    if args.list:
        list_cache()
    elif args.clear:
        clear_cache()
    elif args.period:
        cache_all(periods=[args.period])
    else:
        cache_all()
