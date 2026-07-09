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

tables = ['dentally_appointments', 'dentally_payment_plans', 'dentally_patients', 'dentally_payments', 'dentally_recalls']

for table in tables:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    """, (table,))
    columns = [row[0] for row in cursor.fetchall()]
    print(f"{table}: {columns}")

conn.close()