import requests
import logging
from datetime import datetime
from abc import ABC, abstractmethod
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TenderCollector(ABC):
    """Base class for all tender collectors"""

    def __init__(self, source_name, base_url, db_params):
        self.source_name = source_name
        self.base_url = base_url
        self.db_params = db_params
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AiForm-Procure-Collector/1.0'
        })
        self.metrics = {
            'gross_collected': 0,
            'parsed_success': 0,
            'parse_errors': 0,
            'run_start': datetime.now()
        }

    def collect(self):
        """Main collection loop"""
        try:
            logger.info(f"Starting collection for {self.source_name}")
            tenders = self.scrape_listings()
            logger.info(f"Scraped {len(tenders)} tender listings")

            stored_count = 0
            for tender in tenders:
                try:
                    normalized = self.normalize_record(tender)
                    if normalized:
                        self.store_source_observation(normalized)
                        stored_count += 1
                        self.metrics['parsed_success'] += 1
                    else:
                        self.metrics['parse_errors'] += 1
                except Exception as e:
                    logger.error(f"Error processing tender {tender}: {e}")
                    self.metrics['parse_errors'] += 1

            self.metrics['gross_collected'] = len(tenders)
            self.log_metrics()
            logger.info(f"Completed collection: {stored_count} stored, {self.metrics['parse_errors']} errors")

        except Exception as e:
            logger.error(f"Collection failed for {self.source_name}: {e}")
            raise

    @abstractmethod
    def scrape_listings(self):
        """Override per source. Return list of raw tender records"""
        pass

    @abstractmethod
    def normalize_record(self, raw_record):
        """Override per source. Return normalized dict or None if unparseable"""
        pass

    def store_source_observation(self, normalized):
        """Store in opportunities + source_observations tables"""
        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()

        try:
            # First, insert/update the canonical opportunity record
            cur.execute("""
                INSERT INTO opportunities
                (buyer_normalized, reference_number, title, closing_date, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (reference_number) DO NOTHING
                RETURNING id
            """, (
                normalized.get('buyer_normalized'),
                normalized.get('reference_number'),
                normalized.get('title'),
                normalized.get('closing_date'),
                datetime.now()
            ))

            result = cur.fetchone()
            opportunity_id = result[0] if result else None

            # If opportunity already exists, get its ID
            if not opportunity_id:
                cur.execute("SELECT id FROM opportunities WHERE reference_number = %s",
                           (normalized.get('reference_number'),))
                result = cur.fetchone()
                opportunity_id = result[0] if result else None

            # Then insert source_observation linked to opportunity
            if opportunity_id:
                cur.execute("""
                    INSERT INTO source_observations
                    (opportunity_id, source_name, source_url, source_reference, first_seen, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    opportunity_id,
                    self.source_name,
                    normalized.get('source_url'),
                    normalized.get('reference_number'),
                    datetime.now(),
                    'open'
                ))

            conn.commit()
        finally:
            cur.close()
            conn.close()

    def log_metrics(self):
        """Track collection stats"""
        runtime = (datetime.now() - self.metrics['run_start']).total_seconds() / 60
        parse_success_rate = (
            self.metrics['parsed_success'] / self.metrics['gross_collected'] * 100
            if self.metrics['gross_collected'] > 0 else 0
        )

        logger.info(f"Metrics for {self.source_name}:")
        logger.info(f"  Gross collected: {self.metrics['gross_collected']}")
        logger.info(f"  Parse success rate: {parse_success_rate:.1f}%")
        logger.info(f"  Parse errors: {self.metrics['parse_errors']}")
        logger.info(f"  Runtime: {runtime:.1f} minutes")

        conn = psycopg2.connect(**self.db_params)
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO source_metrics
                (source_name, gross_collected, parse_success_rate)
                VALUES (%s, %s, %s)
                ON CONFLICT (source_name) DO UPDATE SET
                  gross_collected = EXCLUDED.gross_collected,
                  parse_success_rate = EXCLUDED.parse_success_rate
            """, (
                self.source_name,
                self.metrics['gross_collected'],
                parse_success_rate
            ))
            conn.commit()
        finally:
            cur.close()
            conn.close()
