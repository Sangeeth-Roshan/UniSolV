import sys
import re

with open('app/ml/clustering/hotspot_detector.py', 'r') as f:
    content = f.read()

old_block = """            if existing_cluster_id is not None:
                # Mark existing cluster as hotspot
                await db.execute(
                    _UPSERT_CLUSTER_HOTSPOT_SQL,
                    {"cluster_id": existing_cluster_id},
                )
                cluster_id = existing_cluster_id
                logger.info(
                    "run_hotspot_detection: marked cluster %d as hotspot "
                    "(domain=%s, count=%d)",
                    cluster_id, domain, count,
                )"""

new_block = """            if existing_cluster_id is not None:
                # MOD-2 Fix: Check if already a hotspot before acting
                from app.models.issue_cluster import IssueCluster
                existing_cluster = await db.get(IssueCluster, existing_cluster_id)
                if existing_cluster and existing_cluster.is_hotspot:
                    continue  # Already a hotspot, skip re-compressing SLAs

                # Mark existing cluster as hotspot
                if existing_cluster:
                    existing_cluster.is_hotspot = True
                    db.add(existing_cluster)
                    
                cluster_id = existing_cluster_id
                logger.info(
                    "run_hotspot_detection: marked cluster %d as hotspot "
                    "(domain=%s, count=%d)",
                    cluster_id, domain, count,
                )"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('app/ml/clustering/hotspot_detector.py', 'w') as f:
        f.write(content)
    print("hotspot_detector.py updated to skip already-hotspot clusters")
else:
    print("Block not found!")
