"""
scripts/test_classification.py

Classifies 3 sample civic-issue tickets under both CACHED and LIVE modes and
prints the results side by side.

Run from the backend/ directory:
    python -m scripts.test_classification

The LIVE provider requires a valid GEMINI_API_KEY or GROQ_API_KEY in the
environment.  Without one it will automatically fall back to the cached
dataset and print a warning.
"""

from __future__ import annotations

import os
import sys
import textwrap

# Ensure the backend package is importable when run from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.classification_providers import (
    CachedDatasetProvider,
    ClassificationResult,
    LiveLLMProvider,
    set_classifier_mode,
    get_classification_provider,
)

SAMPLE_TICKETS = [
    {
        "title": "Dead cow on main road",
        "description": (
            "A cow died on the main road near our village 3 days ago. "
            "The smell is unbearable and flies are everywhere. "
            "Corporation is not lifting the body. Bimari phailne ka darr hai."
        ),
    },
    {
        "title": "School roof collapsing in heavy rain",
        "description": (
            "Hamare gaon ke primary school ki chhat baarish mein toot rahi hai. "
            "Bachhe andar baithne se darte hain. We complained to the BDO office "
            "3 months ago but nothing happened. Please fix urgently."
        ),
    },
    {
        "title": "Pension not received for 4 months",
        "description": (
            "My widow pension stopped 4 months ago without any notice. "
            "I went to the block office twice but they say KYC is pending. "
            "Maine KYC pehle hi kar li thi. Ghar mein sirf main hoon, "
            "kaisi guzara karoon?"
        ),
    },
]

COL_WIDTH = 38


def _fmt_result(r: ClassificationResult) -> list[str]:
    """Format a ClassificationResult as a list of display lines."""
    review = "[YES - route to human]" if r.needs_human_review else "No"
    return [
        f"  domain       : {r.domain}",
        f"  severity     : {r.severity_score:.2f}",
        f"  confidence   : {r.confidence:.2f}",
        f"  human review?: {review}",
        f"  provider     : {r.provider}",
    ]


def _print_side_by_side(
    ticket: dict,
    cached_result: ClassificationResult,
    live_result: ClassificationResult,
) -> None:
    print()
    sep = "-" * (COL_WIDTH * 2 + 3)
    print(sep)
    title_wrapped = textwrap.wrap(f"Ticket: {ticket['title']}", width=COL_WIDTH * 2 + 3)
    for line in title_wrapped:
        print(line)
    print(sep)

    cached_lines = _fmt_result(cached_result)
    live_lines = _fmt_result(live_result)
    header = f"{'CACHED PROVIDER':<{COL_WIDTH}} | {'LIVE PROVIDER':<{COL_WIDTH}}"
    print(header)
    print("-" * COL_WIDTH + "-+-" + "-" * COL_WIDTH)

    for c, l in zip(cached_lines, live_lines):
        print(f"{c:<{COL_WIDTH}} | {l:<{COL_WIDTH}}")


def main() -> None:
    print("\n" + "=" * 80)
    print("  UniSOLV — Classification Provider Comparison Test")
    print("=" * 80)
    print(f"  CLASSIFIER_MODE env  : {os.getenv('CLASSIFIER_MODE', 'cached (default)')}")
    print(f"  LLM_PROVIDER env     : {os.getenv('LLM_PROVIDER', 'gemini (default)')}")
    print(f"  GEMINI_API_KEY set?  : {'Yes' if os.getenv('GEMINI_API_KEY') else 'No'}")
    print(f"  GROQ_API_KEY set?    : {'Yes' if os.getenv('GROQ_API_KEY') else 'No'}")

    print("\nLoading providers...")
    cached_provider = CachedDatasetProvider()
    live_provider = LiveLLMProvider()

    for i, ticket in enumerate(SAMPLE_TICKETS, 1):
        print(f"\n[{i}/{len(SAMPLE_TICKETS)}] Classifying: {ticket['title']!r}...")

        cached_r = cached_provider.classify(ticket["title"], ticket["description"])
        live_r = live_provider.classify(ticket["title"], ticket["description"])

        _print_side_by_side(ticket, cached_r, live_r)

    print()
    print("=" * 80)
    print("  Factory function test — runtime mode switch")
    print("=" * 80)

    print("\n  Factory returns (default / CLASSIFIER_MODE env):")
    p = get_classification_provider()
    r = p.classify(SAMPLE_TICKETS[0]["title"], SAMPLE_TICKETS[0]["description"])
    print(f"    provider={r.provider}  domain={r.domain}  confidence={r.confidence:.2f}")

    print("\n  Switching mode to 'live' in-memory...")
    set_classifier_mode("live")
    p = get_classification_provider()
    r = p.classify(SAMPLE_TICKETS[0]["title"], SAMPLE_TICKETS[0]["description"])
    print(f"    provider={r.provider}  domain={r.domain}  confidence={r.confidence:.2f}")

    print("\n  Switching mode back to 'cached' in-memory...")
    set_classifier_mode("cached")
    p = get_classification_provider()
    r = p.classify(SAMPLE_TICKETS[0]["title"], SAMPLE_TICKETS[0]["description"])
    print(f"    provider={r.provider}  domain={r.domain}  confidence={r.confidence:.2f}")

    print("\n[OK] All tests complete.\n")


if __name__ == "__main__":
    main()
