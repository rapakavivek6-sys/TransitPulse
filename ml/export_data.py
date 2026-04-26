import pandas as pd
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="bus_ops",
    user="postgres",
    password="Sunitha@1970",
    port=5432
)

query = """
SELECT
    b.id,
    b.route_id,
    b.current_stop_index,
    b.occupancy,
    b.capacity,
    b.status,
    b.next_eta_min,
    t.level AS traffic_level,
    t.multiplier AS traffic_multiplier,
    b.updated_at
FROM buses b
CROSS JOIN LATERAL (
    SELECT level, multiplier
    FROM traffic
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
) t
"""

df = pd.read_sql(query, conn)
conn.close()

df.to_csv("ml/data/bus_training_data.csv", index=False)
print("Export complete: ml/data/bus_training_data.csv")
print(df.head())