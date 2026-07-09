import psycopg2
import os

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "dentally_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1964")

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cursor = conn.cursor()

# Check all tables
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
tables = cursor.fetchall()
print('Tables:', [t[0] for t in tables])

# Check practitioners for admin
cursor.execute("SELECT * FROM dentally_practitioners WHERE role LIKE '%admin%' OR role LIKE '%Admin%'")
rows = cursor.fetchall()
print('\nAdmin practitioners:', rows)

# Check all practitioners columns
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'dentally_practitioners' 
    AND table_schema = 'public'
    ORDER BY ordinal_position
""")
cols = cursor.fetchall()
print('\nPractitioners columns:', [c[0] for c in cols])

# Get first 3 practitioners
cursor.execute('SELECT * FROM dentally_practitioners LIMIT 3')
rows = cursor.fetchall()
print('\nFirst 3 practitioners:', rows)

# Check if there's a users table
for t in tables:
    if 'user' in t[0].lower():
        cursor.execute(f'SELECT * FROM {t[0]} LIMIT 5')
        rows = cursor.fetchall()
        print(f'\n{t[0]} data:', rows)

conn.close()