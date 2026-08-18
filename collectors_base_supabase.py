import requests
import logging
from datetime import datetime
from abc import ABC, abstractmethod
from supabase import create_client
import os
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TenderCollector(ABC):
    """Base class for all tender collectors - Supabase edition"""

    def __init__(self, source_name, base_url):
        self.source_name = source_name
        self.base_url = base_url

        # Initialize Supabase client
        # Try both naming conventions (collector vs Next.js)
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ variants)")

        self.supabase = create_client(supabase_url, supabase_key)

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
                        self.store_tender(normalized)
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

    def store_tender(self, normalized):
        """Store tender in rfqs table, fallback to JSON if Supabase unavailable"""
        try:
            # Convert closing_date to ISO string if it's a datetime object
            closing_date = normalized.get('closing_date')
            if isinstance(closing_date, datetime):
                closing_date = closing_date.isoformat()

            # Convert estimated_budget to float if present
            estimated_budget = normalized.get('estimated_budget')
            if estimated_budget and isinstance(estimated_budget, str):
                try:
                    estimated_budget = float(estimated_budget.replace(',', '').replace(' ', ''))
                except (ValueError, AttributeError):
                    estimated_budget = None

            # Prepare data for rfqs table
            tender_data = {
                'title': normalized.get('title'),
                'buyer_org': normalized.get('buyer_normalized'),
                'closing_date': closing_date,
                'published_date': datetime.now().isoformat(),
                'source_name': self.source_name,
                'external_reference': normalized.get('reference_number'),
                'is_public': True,
                'status': 'open',
                'description': normalized.get('description', ''),
                'estimated_budget': estimated_budget,
            }

            # Try Supabase first
            try:
                response = self.supabase.table('rfqs').insert(tender_data).execute()

                if response.data:
                    logger.info(f"Stored tender: {normalized.get('title')[:50]}...")
                else:
                    logger.warning(f"Failed to store tender: {response}")
                    self._save_to_json_fallback(tender_data)

            except Exception as supabase_error:
                logger.warning(f"Supabase unavailable, saving to JSON: {supabase_error}")
                self._save_to_json_fallback(tender_data)

        except Exception as e:
            logger.error(f"Error storing tender {normalized.get('title')}: {e}")
            raise

    def _save_to_json_fallback(self, tender_data):
        """Save tender to local JSON file for later upload"""
        try:
            json_file = f"tenders_pending_{self.source_name}.json"
            tenders = []

            # Load existing
            if os.path.exists(json_file):
                with open(json_file, 'r') as f:
                    tenders = json.load(f)

            # Append
            tenders.append(tender_data)

            # Save
            with open(json_file, 'w') as f:
                json.dump(tenders, f, indent=2)

            logger.info(f"Saved to {json_file}")
        except Exception as e:
            logger.error(f"Failed to save to JSON fallback: {e}")

    def log_metrics(self):
        """Log collection metrics"""
        duration = (datetime.now() - self.metrics['run_start']).total_seconds()
        logger.info(f"""
        === Metrics for {self.source_name} ===
        Gross Collected: {self.metrics['gross_collected']}
        Successfully Parsed: {self.metrics['parsed_success']}
        Parse Errors: {self.metrics['parse_errors']}
        Duration: {duration:.2f}s
        """)
