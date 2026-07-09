import psycopg2

conn = psycopg2.connect(
    host='127.0.0.1',
    port='54322',
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

# Check account_id distribution
cursor.execute("""
    SELECT 
        CASE 
            WHEN account_id IS NULL OR account_id = '' THEN 'NULL/EMPTY'
            ELSE account_id 
        END as account_group,
        COUNT(*) as count,
        SUM(amount::numeric) as total_amount
    FROM dentally_invoices
    GROUP BY account_group
    ORDER BY count DESC
    LIMIT 20
""")

results = cursor.fetchall()
print("Account ID Distribution:")
print(f"{'Account ID':<30} {'Count':<10} {'Total Amount':<20}")
print("-" * 60)
for row in results:
    print(f"{str(row[0]):<30} {row[1]:<10} {row[2]:<20.2f}")

# Check sample of actual account_ids
cursor.execute("""
    SELECT account_id, COUNT(*) as count
    FROM dentally_invoices
    WHERE account_id IS NOT NULL AND account_id != ''
    GROUP BY account_id
    LIMIT 10
""")

print("\nSample Account IDs with data:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} invoices")

conn.close()