import os
import qrcode
import psycopg2

import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # Google DNS
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

local_ip = get_local_ip()

BASE_URL = f"http://{local_ip}:5000/passenger.html?stopId="
print(f"Using local IP: {local_ip}")

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
output_dir = os.path.join(project_root, "frontend", "public", "qrcodes")
os.makedirs(output_dir, exist_ok=True)

conn = psycopg2.connect(
    host="localhost",
    database="bus_ops",
    user="postgres",
    password="Sunitha@1970",
    port=5432
)

cur = conn.cursor()
cur.execute("SELECT id, name FROM stops ORDER BY id;")
stops = cur.fetchall()

for stop_id, stop_name in stops:
    url = f"{BASE_URL}{stop_id}"
    img = qrcode.make(url)
    filename = os.path.join(output_dir, f"{stop_id}.png")
    img.save(filename)
    print(f"Created QR for {stop_name}: {filename} -> {url}")

cur.close()
conn.close()

print("All QR codes generated successfully.")