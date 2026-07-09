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

# Get existing invoices
cursor.execute("SELECT id, dated_on, site_id FROM dentally_invoices LIMIT 20")
invoices = cursor.fetchall()

print(f"Found {len(invoices)} invoices")

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
    ("Invisalign - Single Arch", 2500, 1),
    ("Porcelain Veneer", 700, 1),
    ("Gum Contouring", 400, 1),
    ("Denture - Upper", 800, 1),
    ("Denture - Lower", 800, 1),
]

# Get practitioners
cursor.execute("SELECT id FROM dentally_practitioners LIMIT 10")
practitioners = [row[0] for row in cursor.fetchall()]

# Add invoice items for each invoice
items_added = 0
for invoice_id, dated_on, site_id in invoices:
    # Add 1-4 items per invoice
    num_items = random.randint(1, 4)
    selected_treatments = random.sample(treatments, min(num_items, len(treatments)))
    
    for treatment_name, price, quantity in selected_treatments:
        # Generate unique ID
        item_id = f"II_{items_added}_{random.randint(1000, 9999)}"
        
        # Random date within 30 days of invoice date
        if dated_on:
            try:
                invoice_date = datetime.strptime(dated_on, "%Y-%m-%d")
                random_days = random.randint(0, 30)
                item_date = invoice_date - timedelta(days=random_days)
                created_at = item_date.strftime("%Y-%m-%dT%H:%M:%S")
            except:
                created_at = "2025-01-01T09:00:00"
        else:
            created_at = "2025-01-01T09:00:00"
        
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
                '88f36fa3-e442-4a15-beac-734cf65d003e',  # organization_id
                f"II{items_added + 1}",  # dentally_id
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
print(f"\nAdded {items_added} invoice items")

# Verify
cursor.execute("SELECT COUNT(*) FROM dentally_invoice_items")
total_items = cursor.fetchone()[0]
print(f"Total invoice items in database: {total_items}")

# Show sample
cursor.execute("""
    SELECT ii.name, ii.total_price, ii.quantity, i.dated_on
    FROM dentally_invoice_items ii
    JOIN dentally_invoices i ON ii.invoice_id = i.id
    LIMIT 10
""")
print("\nSample invoice items:")
for row in cursor.fetchall():
    print(f"  {row[0]}: £{row[1]} (qty: {row[2]}) - Invoice date: {row[3]}")

conn.close()
print("\nSample data added successfully!")
