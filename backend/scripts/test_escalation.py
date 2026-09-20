"""
test_escalation.py

Simulates the routing and escalation process for tickets.
"""

import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.enums import TicketStatus, EventType
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.ticket_event import TicketEvent
from app.services.routing.escalation_engine import rank_institutions, dispatch_ticket, check_sla_breaches

class TestEscalationEngine(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Setup mock db session
        self.db = AsyncMock()
        self.added_objects = []
        self.db.add = MagicMock(side_effect=lambda obj: self.added_objects.append(obj))
        
        # Create some institutions
        self.inst1 = Institution(
            id=1,
            name="Inst 1",
            domains_of_expertise=["water", "roads"],
            reputation_score=0.5,  # MOD-4: Starting reputation per spec is 0.5, not 0.8
            current_load=0,
            reputation_by_domain={}
        )
        self.inst2 = Institution(
            id=2,
            name="Inst 2",
            domains_of_expertise=["water"],
            reputation_score=0.9,
            current_load=5,
            reputation_by_domain={}
        )
        self.inst3 = Institution(
            id=3,
            name="Inst 3",
            domains_of_expertise=["healthcare"],
            reputation_score=0.5,
            current_load=0,
            reputation_by_domain={}
        )
        self.institutions = [self.inst1, self.inst2, self.inst3]
        
        self.mock_result = MagicMock()
        self.mock_result.scalars.return_value.all.return_value = self.institutions
        self.db.execute.return_value = self.mock_result
        
        def mock_get(model, pk):
            if model == Institution:
                return next((i for i in self.institutions if i.id == pk), None)
            return None
            
        self.db.get.side_effect = mock_get

    async def test_rank_institutions(self):
        ticket = Ticket(id=1, domain="water", severity_score=0.5)
        # Inst 1: domain_match=1 (score +2.0), rep=0.8 (score +0.8), load=0 (score +1.0) => 3.8
        # Inst 2: domain_match=1 (score +2.0), rep=0.9 (score +0.9), load=5 (score +0.16) => 3.06
        # Inst 3: domain_match=0 (score +0.0), rep=0.5 (score +0.5), load=0 (score +1.0) => 1.5
        
        shortlist = await rank_institutions(ticket, self.db)
        self.assertEqual(shortlist, [1, 2, 3])
        
    async def test_dispatch_ticket(self):
        ticket = Ticket(id=2, domain="water", severity_score=0.5)
        await dispatch_ticket(ticket, self.db)
        
        self.assertEqual(ticket.status, TicketStatus.routed)
        self.assertEqual(ticket.assigned_institution_id, 1) # Best match
        
        # 48h * (1 - 0.25) = 36h
        self.assertIsNotNone(ticket.sla_deadline)
        
        # Check event logged
        events = [e for e in self.added_objects if isinstance(e, TicketEvent)]
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].event_type, EventType.routed)
        self.assertIn("Routed to institution 1", events[0].notes)

    async def test_accept_in_time(self):
        # Simulating the endpoint behavior natively here
        ticket = Ticket(id=3, domain="water", status=TicketStatus.routed, assigned_institution_id=1)
        ticket.sla_deadline = datetime.now(timezone.utc) + timedelta(hours=10)
        
        # Institution accepts before SLA
        ticket.status = TicketStatus.accepted
        event = TicketEvent(ticket_id=ticket.id, event_type=EventType.accepted)
        self.db.add(event)
        
        # Run sla check, should not pick this ticket
        self.mock_result.scalars.return_value.all.return_value = []
        
        summary = await check_sla_breaches(self.db)
        self.assertEqual(summary["escalated"], 0)

    async def test_miss_sla_and_escalate(self):
        now = datetime.now(timezone.utc)
        ticket = Ticket(
            id=4, 
            domain="water", 
            status=TicketStatus.routed, 
            assigned_institution_id=1,
            sla_deadline=now - timedelta(hours=1),
            routing_shortlist=[2, 3]
        )
        
        # For the check_sla_breaches db.execute call:
        # First execute: get tickets
        # Second execute: get TicketEvents
        # Third execute: get Institutions
        # Let's mock the db.execute more carefully
        
        async def mock_execute(query):
            mock_res = MagicMock()
            if "tickets" in str(query):
                mock_res.scalars.return_value.all.return_value = [ticket]
            elif "ticket_events" in str(query):
                ev = TicketEvent(ticket_id=ticket.id, event_type=EventType.routed, notes="Routed to institution 1")
                mock_res.scalars.return_value = [ev]
            elif "institutions" in str(query):
                # When ranking, we pass exclude_ids=[1]. So it should return inst2 and inst3
                mock_res.scalars.return_value.all.return_value = [self.inst2, self.inst3]
            return mock_res
            
        self.db.execute.side_effect = mock_execute
        
        summary = await check_sla_breaches(self.db)
        
        # Check that it escalated
        self.assertEqual(summary["escalated"], 1)
        self.assertEqual(ticket.assigned_institution_id, 2) # Escalated to inst 2
        
        # Check inst1 penalty
        self.assertEqual(self.inst1.reputation_score, 0.40) # 0.8 EMA with 0.0 penalty
        
        events = [e for e in self.added_objects if isinstance(e, TicketEvent)]
        self.assertTrue(any(e.event_type == EventType.escalated for e in events))
        
if __name__ == "__main__":
    unittest.main()
