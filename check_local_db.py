import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(host='127.0.0.1', port=5432, dbname='postgres', user='postgres', password='1964')
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = [r['table_name'] for r in cur.fetchall()]
print('Tables:', tables)

for t in ['dentally_sites', 'dentally_appointments', 'dentally_invoices', 'dentally_patients', 'dentally_practitioners', 'dentally_payments', 'dentally_payment_plans', 'dentally_recalls']:
    if t in tables:
        cur.execute('SELECT COUNT(*) as cnt FROM {}'.format(t))
        print('{}: {} rows'.format(t, cur.fetchone()['cnt']))
    else:
        print('{}: TABLE NOT FOUND'.format(t))

print()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dentally_sites' AND table_schema = 'public' ORDER BY ordinal_position")
for r in cur.fetchall():
    print("dentally_sites.{}: {}".format(r['column_name'], r['data_type']))

print()
print('=== Testing sites query ===')
try:
    cur.execute("SELECT name, town, postcode, active FROM dentally_sites WHERE active = 1")
    rows = cur.fetchall()
    print('active = 1: OK, {} rows'.format(len(rows)))
    for r in rows:
        print(dict(r))
except Exception as e:
    print('active = 1 ERROR: {}'.format(e))

try:
    cur.execute("SELECT name, town, postcode, active FROM dentally_sites WHERE active = true")
    rows = cur.fetchall()
    print('active = true: OK, {} rows'.format(len(rows)))
    for r in rows:
        print(dict(r))
except Exception as e:
    print('active = true ERROR: {}'.format(e))

print()
print('=== Testing ai-insights query ===')
try:
    cur.execute("""
        SELECT s.name as site_name,
               COUNT(DISTINCT a.id) as total_appointments,
               SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed_appointments
        FROM dentally_sites s
        LEFT JOIN dentally_appointments a ON s.id::text = a.site_id
        WHERE a.start_time >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY s.name
        ORDER BY completed_appointments ASC
        LIMIT 3
    """)
    rows = cur.fetchall()
    print('OK: {} rows'.format(len(rows)))
    for r in rows:
        print(dict(r))
except Exception as e:
    print('ERROR: {}'.format(e))

print()
print('=== Testing league query ===')
try:
    cur.execute("""
        SELECT s.name as site_name,
               COUNT(DISTINCT a.id) as total_appointments,
               SUM(CASE WHEN LOWER(a.status) = 'completed' THEN 1 ELSE 0 END) as completed,
               COALESCE(SUM(i.amount::numeric), 0) as revenue
        FROM dentally_sites s
        LEFT JOIN dentally_appointments a ON s.id::text = a.site_id
        LEFT JOIN dentally_invoices i ON s.id::text = i.site_id
        GROUP BY s.name
        ORDER BY revenue DESC
    """)
    rows = cur.fetchall()
    print('OK: {} rows'.format(len(rows)))
    for r in rows[:3]:
        print(dict(r))
except Exception as e:
    print('ERROR: {}'.format(e))

conn.close()
