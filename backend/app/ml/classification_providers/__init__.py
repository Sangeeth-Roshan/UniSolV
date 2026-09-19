"""
Classification provider factory + runtime mode management.

``CLASSIFIER_MODE=cached|live``  (default: ``cached``)
``LLM_PROVIDER=groq|gemini``    (default: ``gemini``, used when mode=live)

The module exposes a *mutable* state object so the admin endpoint can flip
the mode in-memory without a server restart.
"""

from __future__ import annotations

import logging
import os
from threading import Lock

from app.ml.classification_providers.base import ClassificationProvider, ClassificationResult
from app.ml.classification_providers.cached_provider import CachedDatasetProvider
from app.ml.classification_providers.live_llm_provider import LiveLLMProvider

logger = logging.getLogger(__name__)

_lock = Lock()
_cached_instance: CachedDatasetProvider | None = None
_live_instance: LiveLLMProvider | None = None

# In-memory mode — can be flipped at runtime via the admin endpoint
_current_mode: str = os.getenv("CLASSIFIER_MODE", "cached").lower()


def _get_cached() -> CachedDatasetProvider:
    global _cached_instance
    if _cached_instance is None:
        with _lock:
            if _cached_instance is None:
                _cached_instance = CachedDatasetProvider()
    return _cached_instance


def _get_live() -> LiveLLMProvider:
    global _live_instance
    if _live_instance is None:
        with _lock:
            if _live_instance is None:
                _live_instance = LiveLLMProvider()
    return _live_instance


def get_classification_provider() -> ClassificationProvider:
    """Return the currently active :class:`ClassificationProvider` instance.

    Reads :data:`_current_mode` which can be changed at runtime via
    :func:`set_classifier_mode`.  Defaults to ``"cached"`` if the env var is
    unset or invalid.
    """
    mode = _current_mode
    if mode == "live":
        logger.debug("factory: returning LiveLLMProvider")
        return _get_live()
    if mode != "cached":
        logger.warning("factory: unknown CLASSIFIER_MODE=%r — defaulting to cached", mode)
    logger.debug("factory: returning CachedDatasetProvider")
    return _get_cached()


def set_classifier_mode(mode: str) -> None:
    """Flip the active classifier mode in-memory (no restart required).

    Args:
        mode: ``"cached"`` or ``"live"``

    Raises:
        ValueError: if *mode* is not one of the accepted values.
    """
    global _current_mode
    mode = mode.lower()
    if mode not in {"cached", "live"}:
        raise ValueError(f"Invalid classifier mode {mode!r}. Must be 'cached' or 'live'.")
    with _lock:
        _current_mode = mode
    logger.info("Classifier mode switched to: %s", mode)


def get_current_mode() -> str:
    """Return the currently active mode string."""
    return _current_mode


__all__ = [
    "ClassificationProvider",
    "ClassificationResult",
    "CachedDatasetProvider",
    "LiveLLMProvider",
    "get_classification_provider",
    "set_classifier_mode",
    "get_current_mode",
]
