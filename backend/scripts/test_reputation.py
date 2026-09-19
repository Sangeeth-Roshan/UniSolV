"""
test_reputation.py
"""
import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

# Mock modules to avoid needing DB access during logic test
sys.modules["fastapi"] = MagicMock()
sys.modules["sqlalchemy.ext.asyncio"] = MagicMock()

from app.models.enums import TicketStatus, EventType
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.rating import Rating
from app.services.reputation.reputation_engine import compute_reputation_update

class TestReputationEngine(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = AsyncMock()
        self.added_objects = []
        self.db.add = MagicMock(side_effect=lambda obj: self.added_objects.append(obj))
        
        self.institution = Institution(
            id=1,
            name="Test Inst",
            domains_of_expertise=["water"],
            reputation_score=0.5,
            current_load=0,
            reputation_by_domain={}
        )
        
        def mock_get(model, pk):
            if model == Institution and pk == 1:
                return self.institution
            return None
            
        self.db.get.side_effect = mock_get

    async def test_compute_reputation_verified_fast(self):
        # A ticket closed perfectly in half SLA
        now = datetime.now(timezone.utc)
        ticket = Ticket(
            id=1, 
            domain="water", 
            created_at=now - timedelta(hours=24),
            sla_deadline=now + timedelta(hours=24), # Total SLA = 48h
            status=TicketStatus.closed
        )
        # Rating 5 stars
        rating = Rating(ticket_id=1, score=5)
        
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = rating
        self.db.execute.return_value = mock_res
        
        # Formula delta:
        # Res: 1.0 * 0.5 = 0.5
        # Rating: (5-1)/4 = 1.0 * 0.3 = 0.3
        # Turnaround: 24h/48h = 0.5 -> max(0, 1 - 0.5) = 0.5 * 0.2 = 0.1
        # Total delta: 0.9
        # new_score: 0.2 * 0.9 + 0.8 * 0.5 = 0.18 + 0.40 = 0.58
        
        new_score = await compute_reputation_update(1, ticket, self.db, is_sla_breach=False)
        self.assertAlmostEqual(new_score, 0.58)
        self.assertAlmostEqual(self.institution.reputation_score, 0.58)
        self.assertAlmostEqual(self.institution.reputation_by_domain["water"], 0.58)

    async def test_compute_reputation_sla_breach(self):
        now = datetime.now(timezone.utc)
        ticket = Ticket(id=2, domain="water", created_at=now - timedelta(hours=50), sla_deadline=now - timedelta(hours=2))
        
        # SLA breach penalty
        # Res: 0.0 * 0.5 = 0.0
        # Rating: 0.0 * 0.3 = 0.0
        # Turnaround: 0.0 * 0.2 = 0.0
        # Total delta: 0.0
        # new_score: 0.2 * 0.0 + 0.8 * 0.5 = 0.40
        
        new_score = await compute_reputation_update(1, ticket, self.db, is_sla_breach=True)
        self.assertAlmostEqual(new_score, 0.40)
        self.assertAlmostEqual(self.institution.reputation_score, 0.40)
        self.assertAlmostEqual(self.institution.reputation_by_domain["water"], 0.40)

if __name__ == "__main__":
    unittest.main()
