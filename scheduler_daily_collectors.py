#!/usr/bin/env python3
"""
Daily tender collection scheduler using APScheduler
Runs all collectors every day at a specified time
"""

import os
import logging
import sys
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from collector_ekurhuleni import EkurhuleniCollector
from collector_dbsa import DBSACollector
from collector_tcta import TCTACollector
from collector_sanral import SANRALCollector
from collector_etenders import ETendersCollector
from collector_eskom import EskomCollector
from collector_capetown import CapeownCollector
from collector_coj import CojCollector
from reconciliation_daily_status import run_reconciliation

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_daily_collection():
    """Run all collectors and log results"""
    logger.info("\n" + "="*70)
    logger.info(f"Starting daily collection run at {datetime.now()}")
    logger.info("="*70)

    collectors = [
        ('eTenders', ETendersCollector()),
        ('Eskom', EskomCollector()),
        ('City of Cape Town', CapeownCollector()),  # Limited to 50 pages, last 90 days
        ('City of Johannesburg', CojCollector()),  # NEW - Limited to 50 pages, last 90 days
        ('Ekurhuleni', EkurhuleniCollector()),  # Re-enabled with closed-tender filtering
        ('DBSA', DBSACollector()),
        ('TCTA', TCTACollector()),
        ('SANRAL', SANRALCollector()),
    ]

    total_scraped = 0
    total_stored = 0
    total_errors = 0

    for name, collector in collectors:
        try:
            logger.info(f"\nRunning {name} collector...")
            collector.collect()

            total_scraped += collector.metrics['gross_collected']
            total_stored += collector.metrics['parsed_success']
            total_errors += collector.metrics['parse_errors']

        except Exception as e:
            logger.error(f"Failed to run {name} collector: {e}")
            total_errors += 1
            continue

    logger.info("\n" + "="*70)
    logger.info(f"Daily collection complete!")
    logger.info(f"Total scraped: {total_scraped}")
    logger.info(f"Total stored: {total_stored}")
    logger.info(f"Total errors: {total_errors}")
    logger.info("="*70)

    # Run reconciliation to recalculate all tender statuses
    logger.info("\nRunning daily status reconciliation...")
    logger.info("="*70)
    try:
        run_reconciliation()
    except Exception as e:
        logger.error(f"Failed to run reconciliation: {e}")
        total_errors += 1

    logger.info(f"Completion time: {datetime.now()}")
    logger.info("="*70 + "\n")


def start_scheduler(hour=6, minute=0):
    """Start the APScheduler daemon"""
    scheduler = BackgroundScheduler()

    # Add daily job at specified time (default 6:00 AM)
    scheduler.add_job(
        run_daily_collection,
        trigger=CronTrigger(hour=hour, minute=minute),
        id='daily_tender_collection',
        name='Daily Tender Collection',
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"\n✅ Scheduler started!")
    logger.info(f"📅 Collection will run daily at {hour:02d}:{minute:02d}")
    logger.info(f"Press Ctrl+C to stop\n")

    try:
        # Keep the scheduler running
        while True:
            pass
    except KeyboardInterrupt:
        logger.info("\nShutting down scheduler...")
        scheduler.shutdown()
        logger.info("Scheduler stopped.")
        sys.exit(0)


def run_once():
    """Run collection immediately (for testing)"""
    logger.info("Running one-time collection (testing mode)...")
    run_daily_collection()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Daily tender collection scheduler')
    parser.add_argument('--hour', type=int, default=6, help='Hour to run collection (0-23, default 6)')
    parser.add_argument('--minute', type=int, default=0, help='Minute to run collection (0-59, default 0)')
    parser.add_argument('--once', action='store_true', help='Run collection once and exit')

    args = parser.parse_args()

    if args.once:
        run_once()
    else:
        start_scheduler(hour=args.hour, minute=args.minute)
