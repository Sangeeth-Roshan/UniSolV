import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
import jwt
from datetime import datetime, timedelta, timezone

client = TestClient(app)

print("--- ITEM 1: CRIT-4 (Auth Verification) ---")

# 1. No Auth Token
print("\n[NO AUTH TOKEN]")
r1 = client.post("/api/tickets/1/accept")
print(f"POST /api/tickets/1/accept -> {r1.status_code}")

r2 = client.post("/api/admin/classifier-mode", json={"mode": "live"})
print(f"POST /api/admin/classifier-mode -> {r2.status_code}")

r3 = client.patch("/api/tickets/1/attribution", json={"ip_outcome": "none"})
print(f"PATCH /api/tickets/1/attribution -> {r3.status_code}")

# 2. Wrong Institution Auth Token
print("\n[WRONG INSTITUTION TOKEN]")
# Create a valid token for a user that belongs to institution 999
# Let's mock the DB to return a ticket assigned to institution 1, and user belonging to institution 999.
# Actually, the dependencies fetch from DB. We can override get_current_user and get_db!
from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.models.ticket import Ticket
from app.models.enums import TicketStatus

class MockTicket:
    id = 1
    assigned_institution_id = 1
    status = TicketStatus.routed

class MockUser:
    id = 42
    role = UserRole.university_admin
    institution_id = 999

async def override_get_current_user():
    return MockUser()

class MockDB:
    async def get(self, model, id):
        if model == Ticket and id == 1:
            return MockTicket()
        return None
    async def commit(self):
        pass
    def add(self, obj):
        pass

async def override_get_db():
    yield MockDB()

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

r4 = client.post("/api/tickets/1/accept")
print(f"POST /api/tickets/1/accept (assigned_inst=1, user_inst=999, role=univ_admin) -> {r4.status_code} {r4.json()}")
