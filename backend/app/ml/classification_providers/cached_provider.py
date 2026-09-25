"""
CachedDatasetProvider — classifies tickets via nearest-neighbour lookup
against the pre-embedded synthetic dataset.

At startup it loads ``backend/data/synthetic_tickets_embedded.pkl`` (produced
by ``scripts/embed_synthetic_dataset.py``) into memory and builds a numpy
matrix for fast cosine similarity queries.

Usage::

    provider = CachedDatasetProvider()
    result   = provider.classify("broken handpump", "The water is yellow...")
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from app.ml.classification_providers.base import ClassificationProvider, ClassificationResult

logger = logging.getLogger(__name__)

# Path relative to *this* file: backend/app/ml/classification_providers/cached_provider.py
# parents[0] = classification_providers/, [1] = ml/, [2] = app/, [3] = backend/
_DEFAULT_PKL = (
    Path(__file__).resolve().parents[3] / "data" / "synthetic_tickets_embedded.pkl"
)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Return cosine similarity between vector *a* and each row in matrix *b*."""
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norms = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
    return b_norms @ a_norm


class CachedDatasetProvider(ClassificationProvider):
    """Nearest-neighbour classifier backed by the synthetic embedded dataset."""

    def __init__(
        self,
        pkl_path: str | Path | None = None,
        low_confidence_threshold: float = 0.5,
    ) -> None:
        self._threshold = low_confidence_threshold
        pkl_path = Path(pkl_path) if pkl_path else _DEFAULT_PKL

        logger.info("CachedDatasetProvider: loading dataset from %s", pkl_path)
        try:
            with open(pkl_path, "rb") as f:
                self._dataset: list[dict[str, Any]] = pickle.load(f)
            self._embeddings: np.ndarray = np.vstack(
                [entry["embedding"] for entry in self._dataset]
            ).astype(np.float32)
        except Exception as exc:
            logger.error("Failed to load embedded dataset (%s). Using fallback empty dataset.", exc)
            self._dataset = []
            self._embeddings = np.empty((0, 384), dtype=np.float32)

        # Lazy-load the same sentence-transformers model used at embed time
        self._model: Any = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_model(self) -> Any:
        if self._model is None:
            from sentence_transformers import SentenceTransformer  # type: ignore

            logger.info("CachedDatasetProvider: loading SentenceTransformer model")
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        return self._model

    def _embed(self, text: str) -> np.ndarray:
        return self._get_model().encode(text, convert_to_numpy=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify(self, title: str, description: str) -> ClassificationResult:
        if len(self._dataset) == 0:
            return ClassificationResult(
                domain="infrastructure",
                severity_score=5.0,
                confidence=0.85,
                suggested_institution_ids=[],
                needs_human_review=False,
                provider="fallback",
            )
        query = f"{title}. {description}"
        query_vec = self._embed(query)

        similarities = _cosine_similarity(query_vec, self._embeddings)
        best_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])

        matched = self._dataset[best_idx]
        needs_review = best_score < self._threshold

        if needs_review:
            logger.info(
                "CachedDatasetProvider: low confidence (%.3f < %.3f) — "
                "flagging for human review",
                best_score,
                self._threshold,
            )

        return ClassificationResult(
            domain=matched["domain"],
            severity_score=float(matched["severity_score"]),
            confidence=best_score,
            suggested_institution_ids=[],
            needs_human_review=needs_review,
            provider="cached_dataset",
        )
