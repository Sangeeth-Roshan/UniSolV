import time
import requests
import subprocess
from sqlalchemy import create_engine, text
import sys

from app.core.config import settings

def setup_db_and_test():
    print("--- ITEM 3: MOD-7 (Ticket Creation & Clustering) ---")
    
    # 1. Ensure test user exists in DB using sync psycopg2
    # Convert asyncpg URL to psycopg2
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id, name, email, password_hash, role) VALUES (101, 'Test Reporter', 'reporter101@test.com', 'hash', 'citizen') ON CONFLICT (email) DO NOTHING"))
    
    # 2. Start Uvicorn server in the background
    print("\nStarting Uvicorn server...")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8008"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to boot
    time.sleep(4)
    
    try:
        # 3. Create a JWT token for the user so we can pass auth
        import jwt
        from datetime import datetime, timedelta, timezone
        
        token_data = {"sub": "reporter101@test.com", "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
        token = jwt.encode(token_data, settings.SECRET_KEY, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n[POST /api/tickets] Creating a new ticket (pothole at lat=23.3, lng=85.3)...")
        r1 = requests.post("http://127.0.0.1:8008/api/tickets", headers=headers, data={
            "reporter_id": 101,
            "title": "Massive pothole on Main St",
            "description": "It is causing severe traffic and damaging cars.",
            "public_good_consent": "true",
            "lat": 23.3,
            "lng": 85.3
        })
        print(f"Status: {r1.status_code}")
        print(f"Response JSON: {r1.json()}")
        
        print("\n[POST /api/tickets] Creating a second nearby ticket to verify cluster_id...")
        r2 = requests.post("http://127.0.0.1:8008/api/tickets", headers=headers, data={
            "reporter_id": 101,
            "title": "Another pothole on Main St",
            "description": "Very big pothole here.",
            "public_good_consent": "true",
            "lat": 23.3001,
            "lng": 85.3001
        })
        print(f"Status: {r2.status_code}")
        print(f"Response JSON: {r2.json()}")

    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    setup_db_and_test()
