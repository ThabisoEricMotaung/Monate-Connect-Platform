"""
Daily tender collection scheduler.
Runs all collectors on a schedule (default: daily at 6 AM).
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging
import sys

# Import collectors
from collector_ekurhuleni import EkurhuleniCollector
from collector_dbsa import DBSACollector
from collector_tcta import TCTACollector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('collector.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TenderCollectionScheduler:
    """Manages scheduled tender collection"""

    def __init__(self, db_params):
        self.db_params = db_params
        self.scheduler = BackgroundScheduler()
        self.collectors = [
            EkurhuleniCollector(db_params),
            DBSACollector(db_params),
            TCTACollector(db_params),
        ]

    def run_all_collectors(self):
        """Run all collectors sequentially"""
        logger.info(f"Starting scheduled collection run at {datetime.now()}")

        for collector in self.collectors:
            try:
                logger.info(f"Running {collector.source_name} collector...")
                collector.collect()
                logger.info(f"✅ {collector.source_name} completed")
            except Exception as e:
                logger.error(f"❌ {collector.source_name} failed: {e}")

        logger.info(f"Collection run completed at {datetime.now()}")

    def schedule_daily(self, hour=6, minute=0):
        """Schedule collection to run daily at specified time (default: 6 AM)"""
        logger.info(f"Scheduling collection for {hour:02d}:{minute:02d} daily")

        self.scheduler.add_job(
            self.run_all_collectors,
            CronTrigger(hour=hour, minute=minute),
            id='daily_tender_collection',
            name='Daily Tender Collection',
            replace_existing=True
        )

    def schedule_interval(self, minutes=60):
        """Schedule collection to run every N minutes"""
        logger.info(f"Scheduling collection every {minutes} minutes")

        from apscheduler.triggers.interval import IntervalTrigger
        self.scheduler.add_job(
            self.run_all_collectors,
            IntervalTrigger(minutes=minutes),
            id='interval_tender_collection',
            name='Interval Tender Collection',
            replace_existing=True
        )

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")

    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler stopped")

    def run_once(self):
        """Run all collectors once immediately"""
        logger.info("Running collectors immediately (one-time)")
        self.run_all_collectors()


def main():
    """Main entry point"""
    db_params = {
        'host': 'localhost',
        'database': 'aiform_procure',
        'user': 'postgres',
        'password': 'J@mesbond1'
    }

    scheduler = TenderCollectionScheduler(db_params)

    # Option 1: Run once immediately
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        logger.info("Running collectors once")
        scheduler.run_once()
        return

    # Option 2: Schedule for daily 6 AM (default)
    scheduler.schedule_daily(hour=6, minute=0)
    # Or: scheduler.schedule_interval(minutes=60)  # Every hour

    scheduler.start()

    logger.info("Scheduler is running. Press Ctrl+C to stop.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        logger.info("Stopping scheduler...")
        scheduler.stop()


if __name__ == '__main__':
    main()
