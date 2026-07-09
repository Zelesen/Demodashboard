#!/usr/bin/env python3
"""
Add recent dummy invoice data to make the Invoice Trend chart work
"""
import psycopg2
import uuid
from datetime import datetime, timedelta
import random

# Database connection
DB_HOST = "127.0.0.1"
DB_PORT = "54322"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    return conn

def generate_invoices():
    """Generate invoices for the last 30 days"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Sample data - use actual site UUIDs from database
    patients = [100000, 100001, 100002, 100003, 100004, 100005, 100006, 100007, 100008, 100009, 100010]
    sites = [
        '3e812321-5803-41d6-9be6-278af3721699',  # Bright Smiles Camden
        '2fe29258-d536-4423-9c06-774ac24dbe6c',  # Bright Smiles Islington
        'e570e5c1-fbd4-4c55-8f45-7aeeed0cfcde',  # Bright Smiles Shoreditch
        '26fdca1c-8b7b-4ff0-80b4-e0b1836d263b',  # Bright Smiles Greenwich
        'b6eed093-13ae-49ae-89b2-03fa09a73234',  # Bright Smiles Richmond
        '3fc6fa41-dcef-4c52-a353-bed6d4db48ec'   # Bright Smiles Croydon
    ]
    
    # Generate invoices for the last 30 days
    today = datetime.now()
    invoices_to_insert = []
    
    for day_offset in range(30, -1, -1):  # Last 30 days including today
        date = today - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        
        # Generate 3-8 invoices per day
        num_invoices = random.randint(3, 8)
        
        for i in range(num_invoices):
            invoice_id = str(uuid.uuid4())
            patient_id = random.choice(patients)
            site_id = random.choice(sites)
            
            # Random amount between £25 and £500
            amount = round(random.uniform(25, 500), 2)
            
            # 70% chance of being paid
            paid = random.random() < 0.7
            amount_outstanding = 0 if paid else round(amount * random.uniform(0, 0.5), 2)
            
            # NHS amount (30% chance of having NHS amount)
            nhs_amount = round(amount * random.uniform(0.3, 0.8), 2) if random.random() < 0.3 else 0
            
            # Paid date
            paid_on = date_str if paid else None
            
            # Create timestamp with timezone
            created_at = f"{date_str}T{random.randint(8, 18):02d}:{random.randint(0, 59):02d}:00+00:00"
            updated_at = created_at
            
            # Reference
            reference = f"INV-{date.strftime('%Y%m%d')}-{i+1:03d}"
            
            invoices_to_insert.append((
                invoice_id,
                '88f36fa3-e442-4a15-beac-734cf65d003e',  # organization_id
                f"I{len(invoices_to_insert) + 1}",  # dentally_id
                date_str,  # dated_on
                (date + timedelta(days=30)).strftime("%Y-%m-%d"),  # due_on
                str(amount),
                str(amount_outstanding),
                str(patient_id),
                None,  # account_id
                paid,
                reference,
                None,  # footnote
                str(nhs_amount) if nhs_amount > 0 else None,
                paid_on,
                None,  # payment_terms
                None,  # sent_at
                str(site_id),
                None,  # user_id
                created_at,
                updated_at,
                '{}'  # raw_json
            ))
    
    # Insert all invoices
    insert_query = """
        INSERT INTO dentally_invoices 
        ("id", "organization_id", "dentally_id", "dated_on", "due_on", "amount", "amount_outstanding",
         "patient_id", "account_id", "paid", "reference", "footnote", "nhs_amount", "paid_on",
         "payment_terms", "sent_at", "site_id", "user_id", "created_at", "updated_at", "raw_json")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        cursor.executemany(insert_query, invoices_to_insert)
        conn.commit()
        print(f"[OK] Successfully inserted {len(invoices_to_insert)} invoices")
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM dentally_invoices")
        total = cursor.fetchone()[0]
        print(f"[OK] Total invoices in database: {total}")
        
        # Show recent invoices
        cursor.execute("""
            SELECT dated_on, COUNT(*) as count, SUM(amount) as total_amount
            FROM dentally_invoices
            WHERE dated_on >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY dated_on
            ORDER BY dated_on DESC
        """)
        recent = cursor.fetchall()
        print("\n[OK] Recent invoices (last 7 days):")
        for row in recent:
            print(f"  {row[0]}: {row[1]} invoices, £{row[2]:.2f} total")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Adding recent dummy invoice data...")
    generate_invoices()