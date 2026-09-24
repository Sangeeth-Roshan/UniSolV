import requests

BASE_URL = "http://127.0.0.1:8000"

users = [
    ("citizen@test.com", "demo123"),
    ("admin@gov.in", "demo123"),
    ("uni@centraltech.edu", "demo123"),
    ("company@healthcorp.com", "demo123")
]

print("=== MODULE 11: AUTHENTICATION ===")
gov_token = None

for email, pwd in users:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": email, "password": pwd},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if resp.status_code == 200:
        print(f"[SUCCESS] Auth for {email} -> Token OK")
        if email == "admin@gov.in":
            gov_token = resp.json().get("access_token")
    else:
        print(f"[FAIL] Auth for {email} -> {resp.status_code} {resp.text}")

print("\n=== MODULE 10: ANALYTICS ENDPOINTS ===")
headers = {"Authorization": f"Bearer {gov_token}"}
endpoints = ["/api/analytics/domains", "/api/analytics/funnel", "/api/analytics/leaderboard", "/api/analytics/hotspots", "/api/analytics/trends"]

for ep in endpoints:
    resp = requests.get(f"{BASE_URL}{ep}", headers=headers)
    print(f"\nGET {ep} (Status: {resp.status_code}):")
    print(resp.json())
