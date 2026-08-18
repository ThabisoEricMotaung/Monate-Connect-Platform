#!/usr/bin/env python3
"""
Run all tender collectors and populate Supabase
"""

import os
import logging
from collector_ekurhuleni import EkurhuleniCollector
from collector_dbsa import DBSACollector
from collector_tcta import TCTACollector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to load from .env, but don't fail if it doesn't exist
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception as e:
    logger.warning(f"Could not load .env: {e}")


def run_collectors():
    """Run all collectors in sequence"""

    collectors = [
        ('Ekurhuleni', EkurhuleniCollector()),
        ('DBSA', DBSACollector()),
        ('TCTA', TCTACollector()),
    ]

    total_stored = 0

    for name, collector in collectors:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running {name} collector...")
            logger.info(f"{'='*60}")

            collector.collect()
            total_stored += collector.metrics['parsed_success']

        except Exception as e:
            logger.error(f"Failed to run {name} collector: {e}")
            continue

    logger.info(f"\n{'='*60}")
    logger.info(f"✅ All collectors completed!")
    logger.info(f"Total tenders stored: {total_stored}")
    logger.info(f"Data is now available in Supabase rfqs table")
    logger.info(f"{'='*60}\n")


if __name__ == '__main__':
    run_collectors()
