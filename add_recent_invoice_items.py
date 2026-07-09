import psycopg2
import os
from datetime import datetime, timedelta
import random

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

# Get recent invoices (last 7 days)
cursor.execute("""
    SELECT id, dated_on, site_id 
    FROM dentally_invoices 
    WHERE NULLIF(dated_on, '')::date >= CURRENT_DATE - INTERVAL '7 days'
    LIMIT 50
""")
recent_invoices = cursor.fetchall()

print(f"Found {len(recent_invoices)} recent invoices (last 7 days)")

if len(recent_invoices) == 0:
    print("No recent invoices found. Getting all invoices instead...")
    cursor.execute("SELECT id, dated_on, site_id FROM dentally_invoices LIMIT 100")
    recent_invoices = cursor.fetchall()
    print(f"Using {len(recent_invoices)} invoices")

# Treatment names and prices
treatments = [
    ("New Patient Examination", 60, 1),
    ("Routine Examination", 45, 1),
    ("Emergency Examination", 75, 1),
    ("Deep Cleaning per Quadrant", 120, 1),
    ("Fissure Sealant", 35, 1),
    ("Dental Radiograph", 15, 1),
    ("Amalgam Filling", 95, 1),
    ("Composite Filling", 120, 1),
    ("Root Canal Treatment", 450, 1),
    ("Dental Implant", 850, 1),
    ("Tooth Extraction", 180, 1),
    ("Teeth Whitening", 299, 1),
    ("Dental Crown", 650, 1),
    ("Dental Bridge", 850, 1),
    ("Orthodontic Consultation", 150, 1),
]

# Get practitioners
cursor.execute("SELECT id FROM dentally_practitioners LIMIT 10")
practitioners = [row[0] for row in cursor.fetchall()]

# Add invoice items for each invoice
items_added = 0
for invoice_id, dated_on, site_id in recent_invoices:
    # Add 1-3 items per invoice
    num_items = random.randint(1, 3)
    selected_treatments = random.sample(treatments, min(num_items, len(treatments)))
    
    for treatment_name, price, quantity in selected_treatments:
        # Generate unique ID
        item_id = f"II_recent_{items_added}_{random.randint(1000, 9999)}"
        
        # Use invoice date or today
        if dated_on:
            try:
                invoice_date = datetime.strptime(dated_on, "%Y-%m-%d")
                created_at = invoice_date.strftime("%Y-%m-%dT%H:%M:%S")
            except:
                created_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        else:
            created_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        # Random practitioner
        practitioner_id = random.choice(practitioners) if practitioners else None
        
        try:
            cursor.execute("""
                INSERT INTO dentally_invoice_items 
                (id, organization_id, dentally_id, invoice_id, name, quantity, total_price, item_price, 
                 practitioner_id, created_at, updated_at, raw_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item_id,
                '88f36fa3-e442-4a15-beac-734cf65d003e',
                f"II_RECENT{items_added + 1}",
                invoice_id,
                treatment_name,
                quantity,
                price * quantity,
                price,
                practitioner_id,
                created_at,
                created_at,
                '{}'
            ))
            items_added += 1
        except Exception as e:
            print(f"Error inserting item: {e}")
            continue

conn.commit()
print(f"\nAdded {items_added} recent invoice items")

# Verify
cursor.execute("""
    SELECT COUNT(*) 
    FROM dentally_invoice_items ii 
    JOIN dentally_invoices i ON ii.invoice_id = i.id 
    WHERE NULLIF(i.dated_on, '')::date >= CURRENT_DATE - INTERVAL '7 days'
""")
recent_count = cursor.fetchone()[0]
print(f"Treatment items in last 7 days: {recent_count}")

# Show sample
cursor.execute("""
    SELECT ii.name, ii.total_price, ii.quantity, i.dated_on
    FROM dentally_invoice_items ii
    JOIN dentally_invoices i ON ii.invoice_id = i.id
    WHERE NULLIF(i.dated_on, '')::date >= CURRENT_DATE - INTERVAL '7 days'
    LIMIT 10
""")
print("\nRecent invoice items:")
for row in cursor.fetchall():
    print(f"  {row[0]}: £{row[1]} (qty: {row[2]}) - Date: {row[3]}")

conn.close()
print("\nDone!")