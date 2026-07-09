import psycopg2

conn = psycopg2.connect(
    host='127.0.0.1',
    port='54322',
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = [row[0] for row in cursor.fetchall()]
print("Tables in database:")
for table in tables:
    print(f"  - {table}")

# Check if invoice_items table exists with different name
print("\nSearching for invoice-related tables:")
for table in tables:
    if 'invoice' in table.lower() or 'item' in table.lower():
        print(f"  Found: {table}")
        cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
        print(f"  Columns:")
        for col in cursor.fetchall():
            print(f"    {col[0]:30} {col[1]}")

conn.close()