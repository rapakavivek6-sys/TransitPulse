import pandas as pd
import psycopg2
import joblib

model = joblib.load("ml/models/occupancy_model.joblib")

conn = psycopg2.connect(
    host="localhost",
    database="bus_ops",
    user="postgres",
    password="Sunitha@1970",
    port=5432
)

query = """
SELECT
    id,
    route_id,
    current_stop_index,
    occupancy,
    capacity,
    status,
    (
      SELECT level
      FROM traffic
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) AS traffic_level,
    (
      SELECT multiplier
      FROM traffic
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) AS traffic_multiplier
FROM buses
ORDER BY id
"""

df = pd.read_sql(query, conn)

X = df[[
    "route_id",
    "current_stop_index",
    "occupancy",
    "capacity",
    "status",
    "traffic_level",
    "traffic_multiplier"
]]

predictions = model.predict(X)
df["predicted_next_occupancy"] = predictions.round(2)

with conn.cursor() as cur:
    cur.execute("DELETE FROM predictions WHERE prediction_type = 'occupancy'")
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO predictions (bus_id, prediction_type, predicted_value)
            VALUES (%s, %s, %s)
            """,
            (row["id"], "occupancy", float(row["predicted_next_occupancy"]))
        )
    conn.commit()

conn.close()

print(df[["id", "route_id", "occupancy", "predicted_next_occupancy"]])
print("Occupancy predictions saved to PostgreSQL")