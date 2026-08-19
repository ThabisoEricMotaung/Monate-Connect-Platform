"""
Backfill historical tender data.
Strategy: Run collectors multiple times, archive results by date.
"""

import psycopg2
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HistoricalBackfill:
    """Manage historical tender archival"""

    def __init__(self, db_params):
        self.db_params = db_params

    def analyze_current_coverage(self):
        """Analyze date range of current tenders"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT
                  MIN(closing_date) as earliest_tender,
                  MAX(closing_date) as latest_tender,
                  COUNT(*) as total_tenders,
                  MIN(created_at) as first_collected,
                  MAX(created_at) as last_collected
                FROM opportunities
                WHERE closing_date IS NOT NULL
            """)

            result = cur.fetchone()
            return result

        finally:
            cur.close()
            conn.close()

    def get_coverage_by_source(self):
        """Get date coverage per source"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT
                  so.source_name,
                  COUNT(*) as count,
                  MIN(o.closing_date) as earliest,
                  MAX(o.closing_date) as latest,
                  MIN(so.first_seen) as first_collected,
                  MAX(so.first_seen) as last_collected
                FROM source_observations so
                JOIN opportunities o ON so.opportunity_id = o.id
                WHERE o.closing_date IS NOT NULL
                GROUP BY so.source_name
                ORDER BY so.source_name
            """)

            results = cur.fetchall()
            return results

        finally:
            cur.close()
            conn.close()

    def print_coverage_report(self):
        """Print coverage analysis"""
        print("\n" + "="*80)
        print("TENDER COVERAGE ANALYSIS")
        print("="*80 + "\n")

        # Overall coverage
        overall = self.analyze_current_coverage()
        if overall:
            earliest, latest, total, first_collected, last_collected = overall
            if earliest and latest:
                days_span = (latest - earliest).days
                print(f"Overall Tender Coverage:")
                print(f"  Earliest tender: {earliest.date()}")
                print(f"  Latest tender:   {latest.date()}")
                print(f"  Date range:      {days_span} days")
                print(f"  Total tenders:   {total}\n")

                print(f"Collection Timeline:")
                print(f"  First collected: {first_collected}")
                print(f"  Last collected:  {last_collected}\n")

        # Per-source coverage
        print("Coverage by Source:")
        print("-"*80)
        by_source = self.get_coverage_by_source()
        if by_source:
            for source_name, count, earliest, latest, first_coll, last_coll in by_source:
                if earliest and latest:
                    days = (latest - earliest).days
                    print(f"\n{source_name}:")
                    print(f"  Tenders: {count}")
                    print(f"  Date range: {earliest.date()} to {latest.date()} ({days} days)")
                    print(f"  Collected: {first_coll} to {last_coll}")

        print("\n" + "="*80)
        print("BACKFILL STRATEGY:")
        print("="*80)
        print("""
Option 1: Re-run collectors (verify deduplication)
  - Run each collector again today
  - System will deduplicate (no new records, just updated last_seen)
  - Validates that duplicate handling works
  - Time: 5 minutes
  - Value: Deduplication validation + confidence in system

Option 2: Manual historical archive (if old pages still available)
  - Check if source websites show archived/old tenders
  - Manually collect tenders from 3-6 months ago
  - Insert with backdated timestamps
  - Time: 2-4 hours
  - Value: Historical data for trend analysis

Option 3: Bulk import (if data file available)
  - Get historical tender export from sources (if available)
  - Parse and import in bulk
  - Time: Variable
  - Value: Comprehensive historical coverage

Recommended: Option 1 (quick validation) + Option 2 (if source sites support it)
        """)

    def run_deduplication_test(self):
        """Run collectors again to test deduplication"""
        print("\n" + "="*80)
        print("DEDUPLICATION TEST")
        print("="*80)

        from collector_ekurhuleni import EkurhuleniCollector
        from collector_dbsa import DBSACollector
        from collector_tcta import TCTACollector

        db_params = {
            'host': 'localhost',
            'database': 'aiform_procure',
            'user': 'postgres',
            'password': 'J@mesbond1'
        }

        collectors = [
            EkurhuleniCollector(db_params),
            DBSACollector(db_params),
            TCTACollector(db_params),
        ]

        for collector in collectors:
            try:
                logger.info(f"Running {collector.source_name} (dedup test)...")
                collector.collect()
                logger.info(f"✅ {collector.source_name} completed")
            except Exception as e:
                logger.error(f"❌ {collector.source_name} failed: {e}")

        logger.info("\n✅ Deduplication test complete")
        logger.info("Check database: SELECT COUNT(*) FROM source_observations;")
        logger.info("If count unchanged, deduplication is working correctly.")


def main():
    """Main entry point"""
    db_params = {
        'host': 'localhost',
        'database': 'aiform_procure',
        'user': 'postgres',
        'password': 'J@mesbond1'
    }

    backfill = HistoricalBackfill(db_params)

    # Print coverage analysis
    backfill.print_coverage_report()

    # Optional: Run deduplication test
    # Uncomment below to re-run collectors and verify deduplication
    # backfill.run_deduplication_test()


if __name__ == '__main__':
    main()
