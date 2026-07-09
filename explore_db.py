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

# Get all tables
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
tables = cursor.fetchall()

print('Tables:', [t[0] for t in tables])
print()

# Get schema for each table
for table in tables:
    table_name = table[0]
    print(f'--- {table_name} ---')
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
    print()

# Get sample data from each table
for table in tables:
    table_name = table[0]
    print(f'--- Sample data from {table_name} (first 3 rows) ---')
    cursor.execute(f'SELECT * FROM {table_name} LIMIT 3')
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print()

conn.close()