"""
app/ml/clustering — public API for the clustering sub-package.
"""

from app.ml.clustering.duplicate_detector import find_duplicates
from app.ml.clustering.hotspot_detector import run_hotspot_detection

__all__ = ["find_duplicates", "run_hotspot_detection"]
