"""
Shared Python enumerations for UniSOLV models.

These map 1-to-1 with the PostgreSQL ENUM types created by the Alembic migration.
"""
import enum


class UserRole(str, enum.Enum):
    citizen = "citizen"
    university_admin = "university_admin"
    student = "student"
    company = "company"
    government_officer = "government_officer"


class InstitutionType(str, enum.Enum):
    university = "university"
    company = "company"


class TicketStatus(str, enum.Enum):
    pending_validation = "pending_validation"
    routed = "routed"
    accepted = "accepted"
    in_progress = "in_progress"
    piloting = "piloting"
    verified = "verified"
    closed = "closed"
    escalated = "escalated"


class EventType(str, enum.Enum):
    routed = "routed"
    accepted = "accepted"
    escalated = "escalated"
    proposal_submitted = "proposal_submitted"
    piloted = "piloted"
    verified = "verified"
    closed = "closed"
    hotspot_detected = "hotspot_detected"
    cluster_merged = "cluster_merged"


class IPOutcome(str, enum.Enum):
    patent = "patent"
    startup = "startup"
    publication = "publication"
    none = "none"
