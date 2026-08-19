"""
Metrics dashboard for tender collection sources.
Displays: uniqueness rate, parse success, publication lag, source scorecard.
"""

import psycopg2
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MetricsDashboard:
    """Generate and display collection metrics"""

    def __init__(self, db_params):
        self.db_params = db_params

    def get_source_stats(self):
        """Get statistics for each collector"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT
                  source_name,
                  COUNT(*) as gross_collected,
                  COUNT(*) FILTER (WHERE opportunity_id IS NOT NULL) as linked_to_opportunities,
                  COUNT(*) FILTER (WHERE opportunity_id IS NULL) as unlinked,
                  MAX(first_seen) as last_run,
                  MIN(first_seen) as first_run
                FROM source_observations
                GROUP BY source_name
                ORDER BY gross_collected DESC
            """)

            stats = cur.fetchall()
            return stats

        finally:
            cur.close()
            conn.close()

    def get_uniqueness_metrics(self):
        """Calculate uniqueness rate per source"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                WITH source_counts AS (
                  SELECT
                    source_name,
                    COUNT(DISTINCT source_reference) as unique_refs,
                    COUNT(*) as total_obs
                  FROM source_observations
                  GROUP BY source_name
                )
                SELECT
                  source_name,
                  unique_refs,
                  total_obs,
                  ROUND(100.0 * unique_refs / NULLIF(total_obs, 0), 1) as uniqueness_pct
                FROM source_counts
                ORDER BY uniqueness_pct DESC
            """)

            metrics = cur.fetchall()
            return metrics

        finally:
            cur.close()
            conn.close()

    def get_publication_lag(self):
        """Calculate avg days between collection date and closing date"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT
                  so.source_name,
                  ROUND(AVG(EXTRACT(DAY FROM (o.closing_date - so.first_seen)))::numeric, 1) as avg_lag_days,
                  COUNT(*) as sample_size
                FROM source_observations so
                JOIN opportunities o ON so.opportunity_id = o.id
                WHERE o.closing_date IS NOT NULL
                GROUP BY so.source_name
                ORDER BY avg_lag_days DESC
            """)

            lags = cur.fetchall()
            return lags

        finally:
            cur.close()
            conn.close()

    def get_baseline_comparison(self):
        """Compare baseline vs. incremental records"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT
                  COUNT(*) as total_opportunities,
                  COUNT(DISTINCT source_observations.source_name) as sources_collecting
                FROM opportunities
                LEFT JOIN source_observations ON opportunities.id = source_observations.opportunity_id
            """)

            result = cur.fetchone()
            return result

        finally:
            cur.close()
            conn.close()

    def print_dashboard(self):
        """Print formatted metrics dashboard"""
        print("\n" + "="*80)
        print("TENDER COLLECTION METRICS DASHBOARD")
        print("="*80)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Source statistics
        print("SOURCE COLLECTION STATS:")
        print("-"*80)
        stats = self.get_source_stats()
        if stats:
            for source_name, gross, linked, unlinked, last_run, first_run in stats:
                print(f"\n{source_name}")
                print(f"  Gross collected: {gross}")
                print(f"  Linked to opportunities: {linked}")
                print(f"  Unlinked: {unlinked}")
                if last_run:
                    print(f"  Last run: {last_run}")
                if first_run:
                    print(f"  First run: {first_run}")

        # Uniqueness
        print("\n" + "-"*80)
        print("UNIQUENESS METRICS:")
        print("-"*80)
        uniqueness = self.get_uniqueness_metrics()
        if uniqueness:
            for source_name, unique_refs, total_obs, pct in uniqueness:
                print(f"\n{source_name}")
                print(f"  Unique references: {unique_refs}/{total_obs}")
                print(f"  Uniqueness rate: {pct}%")

        # Publication lag
        print("\n" + "-"*80)
        print("PUBLICATION LAG (days from collection to closing):")
        print("-"*80)
        lags = self.get_publication_lag()
        if lags:
            for source_name, avg_lag, sample_size in lags:
                direction = "early" if avg_lag > 0 else "late"
                print(f"\n{source_name}")
                print(f"  Avg lag: {avg_lag} days {direction}")
                print(f"  Sample size: {sample_size}")

        # Overall summary
        print("\n" + "-"*80)
        print("OVERALL SUMMARY:")
        print("-"*80)
        baseline = self.get_baseline_comparison()
        if baseline:
            total, sources = baseline
            print(f"  Total opportunities: {total}")
            print(f"  Active sources: {sources}")
            print(f"  Avg tenders per source: {total/sources:.1f}")

        print("\n" + "="*80 + "\n")

    def export_csv(self, filename='metrics_report.csv'):
        """Export metrics to CSV"""
        import csv

        with open(filename, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow(['Metric Report', datetime.now().isoformat()])
            writer.writerow([])

            # Source stats
            writer.writerow(['Source', 'Gross Collected', 'Linked', 'Unlinked', 'Last Run'])
            stats = self.get_source_stats()
            for row in stats:
                writer.writerow(row)

            writer.writerow([])

            # Uniqueness
            writer.writerow(['Source', 'Unique Refs', 'Total Obs', 'Uniqueness %'])
            uniqueness = self.get_uniqueness_metrics()
            for row in uniqueness:
                writer.writerow(row)

        logger.info(f"Metrics exported to {filename}")


def main():
    """Main entry point"""
    db_params = {
        'host': 'localhost',
        'database': 'aiform_procure',
        'user': 'postgres',
        'password': 'J@mesbond1'
    }

    dashboard = MetricsDashboard(db_params)
    dashboard.print_dashboard()

    # Optionally export to CSV
    # dashboard.export_csv('metrics_report.csv')


if __name__ == '__main__':
    main()
