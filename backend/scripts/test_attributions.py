"""
test_attributions.py
"""
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

# Mock modules to avoid needing DB access during logic test
sys.modules["fastapi"] = MagicMock()
sys.modules["sqlalchemy.ext.asyncio"] = MagicMock()

from app.models.enums import TicketStatus, EventType, IPOutcome
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.attribution import Attribution

class TestAttributions(unittest.IsolatedAsyncioTestCase):
    def test_attribution_creation(self):
        # We tested logic directly in FastAPI routers, so let's just make sure models construct correctly.
        attr = Attribution(
            ticket_id=1,
            reporter_id=2,
            institution_id=3,
            industry_partner_id=4,
            ip_outcome=None
        )
        self.assertEqual(attr.ticket_id, 1)
        self.assertIsNone(attr.ip_outcome)

        attr.ip_outcome = IPOutcome.patent
        self.assertEqual(attr.ip_outcome, "patent")

    def test_ticket_consent(self):
        ticket = Ticket(
            reporter_id=1,
            title="Test",
            description="Test",
            public_good_consent=True,
            public_good_consent_at=datetime.now(timezone.utc)
        )
        self.assertTrue(ticket.public_good_consent)
        self.assertIsNotNone(ticket.public_good_consent_at)

if __name__ == "__main__":
    unittest.main()
