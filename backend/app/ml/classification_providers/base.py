"""
Abstract base for classification providers.

All classifiers must return a ClassificationResult so the rest of the app
never has to care which provider is currently active.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ClassificationResult:
    """Structured classification output."""

    domain: str
    """One of the 10 civic domains (e.g. 'water management')."""

    severity_score: float
    """Normalised 0-1 severity."""

    confidence: float
    """How certain the classifier is: 0-1.
    Values below the configured threshold should trigger human review."""

    suggested_institution_ids: list[str] = field(default_factory=list)
    """Institution IDs that should receive this ticket (populated by routing
    logic; the classifier may leave this empty)."""

    needs_human_review: bool = False
    """True when confidence is below the configured threshold."""

    provider: str = "unknown"
    """Which provider produced this result — useful for logging/auditing."""


class ClassificationProvider(ABC):
    """Contract that every classification provider must fulfil."""

    @abstractmethod
    def classify(self, title: str, description: str) -> ClassificationResult:
        """Classify a civic issue report.

        Args:
            title: Short title of the ticket.
            description: Full citizen description.

        Returns:
            A :class:`ClassificationResult` instance.
        """
