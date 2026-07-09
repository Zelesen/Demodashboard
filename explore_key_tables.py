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

# Focus on key tables
key_tables = [
    'dentally_invoice_items',
    'dentally_invoices', 
    'dentally_accounts',
    'dentally_treatments',
    'dentally_patients',
    'dentally_sites'
]

for table_name in key_tables:
    print(f'\n=== {table_name} ===')
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = %s 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    """, (table_name,))
    columns = cursor.fetchall()
    for col in columns:
        print(col)
    
    print(f'\nSample data (first 3 rows):')
    cursor.execute(f'SELECT * FROM {table_name} LIMIT 3')
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print()

conn.close()