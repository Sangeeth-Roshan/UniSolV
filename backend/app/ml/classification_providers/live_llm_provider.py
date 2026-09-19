"""
LiveLLMProvider — classifies tickets using a live LLM API.

Supports two free-tier backends:
    - **Groq** (env: ``LLM_PROVIDER=groq``, ``GROQ_API_KEY=<key>``)
    - **Google Gemini** (env: ``LLM_PROVIDER=gemini``, ``GEMINI_API_KEY=<key>``)

On any API error or timeout the provider automatically falls back to
:class:`CachedDatasetProvider` and logs the reason.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from app.ml.classification_providers.base import ClassificationProvider, ClassificationResult

logger = logging.getLogger(__name__)

_VALID_DOMAINS = {
    "education", "healthcare", "agriculture", "water management",
    "sanitation", "environment", "rural livelihoods", "accessibility",
    "urban infrastructure", "public service delivery",
}

_SYSTEM_PROMPT = """You are a civic issue classification assistant for Jharkhand, India.
Given a ticket title and description, classify the issue and respond ONLY with valid JSON.

Required fields:
- domain: one of [education, healthcare, agriculture, "water management", sanitation, environment, "rural livelihoods", accessibility, "urban infrastructure", "public service delivery"]
- severity_score: float 0.0-1.0 (0=trivial, 1=life-threatening emergency)
- confidence: float 0.0-1.0 (how certain you are)
- rationale: one-sentence explanation

Example response:
{"domain": "water management", "severity_score": 0.85, "confidence": 0.92, "rationale": "Contaminated drinking water poses an immediate health risk."}"""

_USER_PROMPT_TEMPLATE = """Title: {title}
Description: {description}

Classify this civic issue ticket:"""


def _parse_llm_json(raw: str) -> dict[str, Any]:
    """Extract and parse the first JSON object from an LLM response string."""
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find first {...} block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {raw!r}")
    return json.loads(match.group())


class LiveLLMProvider(ClassificationProvider):
    """Classifies tickets via a live LLM API with automatic fallback."""

    def __init__(
        self,
        llm_provider: str | None = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self._llm_provider = (llm_provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
        self._timeout = timeout_seconds
        self._fallback: ClassificationProvider | None = None  # lazy-loaded

    # ------------------------------------------------------------------
    # Fallback
    # ------------------------------------------------------------------

    def _get_fallback(self) -> ClassificationProvider:
        if self._fallback is None:
            from app.ml.classification_providers.cached_provider import CachedDatasetProvider
            logger.info("LiveLLMProvider: initialising CachedDatasetProvider fallback")
            self._fallback = CachedDatasetProvider()
        return self._fallback

    def _fallback_classify(self, title: str, description: str, reason: str) -> ClassificationResult:
        logger.warning("LiveLLMProvider: falling back to CachedDatasetProvider — %s", reason)
        result = self._get_fallback().classify(title, description)
        result.provider = f"live_llm_fallback(cached_dataset) [{reason}]"
        return result

    # ------------------------------------------------------------------
    # LLM backends
    # ------------------------------------------------------------------

    def _classify_groq(self, title: str, description: str) -> dict[str, Any]:
        import httpx  # type: ignore

        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")

        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _USER_PROMPT_TEMPLATE.format(
                    title=title, description=description
                )},
            ],
            "temperature": 0.1,
            "max_tokens": 256,
        }
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        return _parse_llm_json(raw)

    def _classify_gemini(self, title: str, description: str) -> dict[str, Any]:
        import httpx  # type: ignore

        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        prompt = f"{_SYSTEM_PROMPT}\n\n{_USER_PROMPT_TEMPLATE.format(title=title, description=description)}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 256},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={api_key}"
        )
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
        raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return _parse_llm_json(raw)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify(self, title: str, description: str) -> ClassificationResult:
        try:
            if self._llm_provider == "groq":
                data = self._classify_groq(title, description)
            elif self._llm_provider == "gemini":
                data = self._classify_gemini(title, description)
            else:
                return self._fallback_classify(
                    title, description, f"unknown LLM_PROVIDER={self._llm_provider!r}"
                )

            domain = data.get("domain", "").lower().strip()
            if domain not in _VALID_DOMAINS:
                logger.warning(
                    "LiveLLMProvider: LLM returned unknown domain %r — clamping to fallback",
                    domain,
                )
                return self._fallback_classify(title, description, f"invalid domain {domain!r}")

            severity = float(data.get("severity_score", 0.5))
            confidence = float(data.get("confidence", 0.5))

            return ClassificationResult(
                domain=domain,
                severity_score=max(0.0, min(1.0, severity)),
                confidence=max(0.0, min(1.0, confidence)),
                needs_human_review=confidence < 0.5,
                provider=f"live_llm({self._llm_provider})",
            )

        except Exception as exc:  # noqa: BLE001
            return self._fallback_classify(title, description, str(exc))
