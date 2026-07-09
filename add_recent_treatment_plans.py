#!/usr/bin/env python3
"""
Add recent dummy treatment plan data to make the Treatment Plans page show data for the last 7 days.
"""
import psycopg2
import uuid
from datetime import datetime, timedelta
import random

DB_HOST = "127.0.0.1"
DB_PORT = "54322"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

ORG_ID = "88f36fa3-e442-4a15-beac-734cf65d003e"

PRACTITIONERS = [
    ('4000', 'Ruth Griffiths'),
    ('4001', 'Henry Smith'),
    ('4002', 'Bradley Newman'),
    ('4003', 'Sian Cox'),
    ('4004', 'Janice Hopkins'),
    ('4005', 'Mary Higgins'),
    ('4006', 'Colin Lloyd'),
    ('4007', 'Leanne Foster'),
    ('4008', 'Chelsea Ryan'),
    ('4009', 'Francesca Harrison'),
]

PATIENTS = [str(i) for i in range(100000, 100051)]

TREATMENTS = [
    ("New Patient Examination", 60),
    ("Routine Examination", 45),
    ("Emergency Examination", 75),
    ("Deep Cleaning per Quadrant", 120),
    ("Fissure Sealant", 35),
    ("Dental Radiograph", 15),
    ("Amalgam Filling", 95),
    ("Composite Filling", 120),
    ("Root Canal Treatment", 450),
    ("Dental Implant", 850),
    ("Tooth Extraction", 180),
    ("Teeth Whitening", 299),
    ("Dental Crown", 650),
    ("Dental Bridge", 850),
    ("Orthodontic Consultation", 150),
    ("Scale and Polish", 55),
    ("Mouth Guard", 120),
    ("Denture Repair", 95),
    ("Periodontal Treatment", 200),
    ("Sedation", 150),
]

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)

def generate_treatment_plans():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get the current max dentally_id
    cursor.execute("SELECT dentally_id FROM dentally_treatment_plans ORDER BY dentally_id DESC LIMIT 1")
    last_tp = cursor.fetchone()
    tp_counter = int(last_tp[0].replace('TP', '')) + 1 if last_tp else 1

    cursor.execute("SELECT dentally_id FROM dentally_treatment_plan_items ORDER BY dentally_id DESC LIMIT 1")
    last_tpi = cursor.fetchone()
    tpi_counter = int(last_tpi[0].replace('TPI', '')) + 1 if last_tpi else 1

    today = datetime.now()
    plans_inserted = 0
    items_inserted = 0

    for day_offset in range(6, -1, -1):
        date = today - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        created_at = f"{date_str}T{random.randint(8, 17):02d}:{random.randint(0, 59):02d}:00+00:00"

        num_plans = random.randint(3, 7)

        for _ in range(num_plans):
            tp_id = str(uuid.uuid4())
            dentally_id = f"TP{tp_counter}"
            tp_counter += 1

            patient_id = random.choice(PATIENTS)
            practitioner_id = random.choice(PRACTITIONERS)[0]

            # 60% completed, 25% active, 15% proposed
            status_roll = random.random()
            if status_roll < 0.60:
                status = "completed"
                completed = "true"
                completed_at = created_at
            elif status_roll < 0.85:
                status = "active"
                completed = "false"
                completed_at = None
            else:
                status = "proposed"
                completed = "false"
                completed_at = None

            nhs_uda_value = str(round(random.uniform(1.0, 12.0), 1))
            private_value = str(round(random.uniform(50, 500), 2))

            start_date = (date - timedelta(days=random.randint(0, 14))).strftime("%Y-%m-%d")

            cursor.execute("""
                INSERT INTO dentally_treatment_plans
                (id, organization_id, dentally_id, patient_id, status, total_cost,
                 raw_json, completed_at, created_at, end_date, import_id,
                 last_completed_at, nhs_completed_uda_value, nhs_uda_value,
                 nickname, practitioner_id, private_treatment_value, updated_at,
                 completed, start_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tp_id, ORG_ID, dentally_id, patient_id, status, None,
                '{}', completed_at, created_at, None, None,
                None, None, nhs_uda_value,
                None, practitioner_id, private_value, created_at,
                completed, start_date
            ))
            plans_inserted += 1

            # Add 1-4 treatment plan items
            num_items = random.randint(1, 4)
            selected_treatments = random.sample(TREATMENTS, min(num_items, len(TREATMENTS)))

            for treatment_name, price in selected_treatments:
                item_id = str(uuid.uuid4())
                item_dentally_id = f"TPI{tpi_counter}"
                tpi_counter += 1

                item_price = str(price + random.randint(-10, 10))
                item_charged = "true"
                item_completed = "true" if completed == "true" else "false"
                item_created_at = created_at

                cursor.execute("""
                    INSERT INTO dentally_treatment_plan_items
                    (id, organization_id, dentally_id, raw_json, base_chart,
                     charged, completed, completed_at, created_at, custom_fields,
                     duration, import_id, invoice_id, nhs_treatment_cat,
                     nomenclature, notes, patient_id, patient_nomenclature,
                     payment_plan_id, position, practitioner_id, price,
                     referrer_id, region, surfaces, teeth,
                     treatment_appointment_id, treatment_id, treatment_plan_id,
                     uda_band, updated_at, appear_on_invoice)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s)
                """, (
                    item_id, ORG_ID, item_dentally_id, '{}', None,
                    item_charged, item_completed, completed_at, item_created_at, None,
                    str(random.randint(5, 60)) if random.random() < 0.5 else None, None, None,
                    str(random.choice(['1', '2', '3'])) if random.random() < 0.3 else None,
                    treatment_name, None, patient_id, None,
                    None, None, practitioner_id, item_price,
                    None, None, None, None,
                    None, None, dentally_id,
                    None, item_created_at, None
                ))
                items_inserted += 1

    conn.commit()
    print(f"[OK] Inserted {plans_inserted} treatment plans")
    print(f"[OK] Inserted {items_inserted} treatment plan items")

    cursor.execute("SELECT COUNT(*) FROM dentally_treatment_plans WHERE NULLIF(created_at, '')::timestamp >= CURRENT_DATE - INTERVAL '7 days'")
    recent = cursor.fetchone()[0]
    print(f"[OK] Treatment plans in last 7 days: {recent}")

    cursor.execute("""
        SELECT TO_CHAR(NULLIF(created_at, '')::date, 'YYYY-MM-DD') as day, COUNT(*)
        FROM dentally_treatment_plans
        WHERE NULLIF(created_at, '')::timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 1
    """)
    print("[OK] Breakdown by day:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} plans")

    conn.close()

if __name__ == "__main__":
    print("Adding recent treatment plan data...")
    generate_treatment_plans()
