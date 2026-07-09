import psycopg2
import random

DB_HOST = "127.0.0.1"
DB_PORT = "54322"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cursor = conn.cursor()

print("Populating account_id values with diverse accounts...")

# First, reset any existing account_ids
cursor.execute("UPDATE dentally_invoices SET account_id = NULL WHERE account_id IS NOT NULL")
conn.commit()
print("Reset existing account IDs")

# Generate 100 sample account IDs
account_ids = [f"ACC_{i:04d}" for i in range(1, 101)]

# Get all invoice IDs
cursor.execute("SELECT id FROM dentally_invoices ORDER BY id")
invoice_ids = [row[0] for row in cursor.fetchall()]

print(f"Assigning account IDs to {len(invoice_ids)} invoices...")

# Assign random account IDs to each invoice
for i, invoice_id in enumerate(invoice_ids):
    account_id = random.choice(account_ids)
    cursor.execute(
        "UPDATE dentally_invoices SET account_id = %s WHERE id = %s",
        (account_id, invoice_id)
    )
    
    if (i + 1) % 10000 == 0:
        conn.commit()
        print(f"  Processed {i + 1} invoices...")

conn.commit()
print(f"Updated {len(invoice_ids)} invoices with account IDs")

# Verify distribution
cursor.execute("""
    SELECT account_id, COUNT(*) as count, SUM(amount::numeric) as total
    FROM dentally_invoices
    WHERE account_id IS NOT NULL AND account_id != ''
    GROUP BY account_id
    ORDER BY count DESC
    LIMIT 15
""")

results = cursor.fetchall()
print("\nTop 15 Accounts:")
for row in results:
    print(f"  {row[0]}: {row[1]} invoices, £{row[2]:.2f}")

# Show total
cursor.execute("SELECT COUNT(*) FROM dentally_invoices WHERE account_id IS NOT NULL AND account_id != ''")
total_with_accounts = cursor.fetchone()[0]
print(f"\nTotal invoices with account IDs: {total_with_accounts}")

conn.close()
print("\nDone!")