import psycopg2

conn = psycopg2.connect(
    host='127.0.0.1',
    port='54322',
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

# Check dentally_id values in invoices
cursor.execute("SELECT dentally_id FROM dentally_invoices LIMIT 10")
invoice_dentally_ids = [row[0] for row in cursor.fetchall()]
print("Sample dentally_id from invoices:")
for id in invoice_dentally_ids:
    print(f"  {id}")

# Check dentally_id values in invoice_items
cursor.execute("SELECT dentally_id FROM dentally_invoice_items LIMIT 10")
item_dentally_ids = [row[0] for row in cursor.fetchall()]
print("\nSample dentally_id from invoice_items:")
for id in item_dentally_ids:
    print(f"  {id}")

# Try to match them
cursor.execute("""
    SELECT COUNT(*) 
    FROM dentally_invoice_items ii 
    JOIN dentally_invoices i ON ii.dentally_id = i.dentally_id
""")
matched = cursor.fetchone()[0]
print(f"\nItems matched by dentally_id: {matched}")

# Check if invoice_id in items matches id in invoices
cursor.execute("SELECT invoice_id FROM dentally_invoice_items LIMIT 10")
item_invoice_ids = [row[0] for row in cursor.fetchall()]
print("\nSample invoice_id from invoice_items:")
for id in item_invoice_ids:
    print(f"  {id}")

cursor.execute("SELECT id FROM dentally_invoices LIMIT 10")
invoice_ids = [row[0] for row in cursor.fetchall()]
print("\nSample id from invoices:")
for id in invoice_ids:
    print(f"  {id}")

conn.close()