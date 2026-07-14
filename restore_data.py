"""Restore demo data from demo-data.sql to local PostgreSQL."""
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(host='127.0.0.1', port=5432, dbname='postgres', user='postgres', password='1964')
cur = conn.cursor()

# Disable triggers and constraints for faster loading
cur.execute("SET session_replication_role = replica")
cur.execute("SET statement_timeout = 0")
conn.commit()

print('Reading and restoring demo-data.sql...')
count = 0
total_lines = 0
buffer = ''

with open('demo-data.sql', 'r', encoding='utf-8') as f:
    for line in f:
        total_lines += 1
        stripped = line.rstrip()
        
        # Skip SET/ALTER/GRANT/SELECT statements and comments
        if not buffer:
            if (stripped.startswith('--') or 
                stripped.startswith('SET ') or
                stripped.startswith('SELECT ') or
                stripped.startswith('ALTER ') or
                stripped.startswith('GRANT ') or
                stripped.startswith('REVOKE ') or
                stripped == ''):
                continue
        
        buffer += line
        
        # Execute when we have a complete statement
        if stripped.endswith(';'):
            stmt = buffer.strip()
            if stmt.startswith('INSERT'):
                try:
                    cur.execute(stmt)
                    conn.commit()
                    count += 1
                    if count % 5 == 0:
                        print(f'  Executed {count} INSERTs (line {total_lines})')
                except Exception as e:
                    conn.rollback()
                    err = str(e)[:120]
                    if 'duplicate key' not in err:
                        print(f'  Error at line {total_lines}: {err}')
            buffer = ''

print(f'\nDone! Executed {count} INSERT statements (processed {total_lines} lines)')

# Verify data
print('\nVerifying data...')
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = [r[0] for r in cur.fetchall()]
for t in tables:
    cur.execute('SELECT COUNT(*) FROM {}'.format(t))
    cnt = cur.fetchone()[0]
    if cnt > 0:
        print('  {}: {} rows'.format(t, cnt))

cur.close()
conn.close()
print('\nRestore complete!')
