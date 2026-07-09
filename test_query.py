import psycopg2

conn = psycopg2.connect(
    host='127.0.0.1',
    port='54322',
    database='postgres',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

# Test the exact query from the endpoint
try:
    cursor.execute("""
        SELECT COUNT(*) 
        FROM dentally_invoice_items ii 
        JOIN dentally_invoices i ON ii.invoice_id = i.id 
        WHERE NULLIF(i.dated_on, '')::date >= CURRENT_DATE - INTERVAL '7 days'
    """)
    count = cursor.fetchone()[0]
    print(f'Treatment items in last 7 days: {count}')
except Exception as e:
    print(f'Error with date filter: {e}')
    
    # Try without date filter
    try:
        cursor.execute("""
            SELECT COUNT(*) 
            FROM dentally_invoice_items ii 
            JOIN dentally_invoices i ON ii.invoice_id = i.id
        """)
        count = cursor.fetchone()[0]
        print(f'Total treatment items (no filter): {count}')
    except Exception as e2:
        print(f'Error without filter: {e2}')

conn.close()