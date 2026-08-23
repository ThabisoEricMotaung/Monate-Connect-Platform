"""
eTenders.gov.za tender collector (National Treasury OCDS API)
Collects from: https://ocds-api.etenders.gov.za/api/OCDSReleases
Uses OCDS (Open Contracting Data Standard) format - public API, no auth required
"""

from collectors_base_supabase import TenderCollector
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import logging
import requests

logger = logging.getLogger(__name__)


class ETendersCollector(TenderCollector):
    """eTenders.gov.za collector using National Treasury OCDS API"""

    def __init__(self):
        super().__init__(
            source_name='eTenders',
            base_url='https://ocds-api.etenders.gov.za'
        )
        self.api_url = 'https://ocds-api.etenders.gov.za/api/OCDSReleases'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AiForm-Procure-Tender-Collector/1.0'
        })

    def scrape_listings(self):
        """Scrape eTenders using OCDS API"""
        tenders = []

        try:
            # Get tenders from past 7 days to catch updates
            today = datetime.now().date()
            start_date = (today - timedelta(days=7)).isoformat()
            end_date = today.isoformat()

            logger.info(f"Fetching eTenders from {start_date} to {end_date}...")

            page_number = 1
            page_size = 1000  # Max for API
            total_fetched = 0

            while True:
                try:
                    params = {
                        'PageNumber': page_number,
                        'PageSize': page_size,
                        'dateFrom': start_date,
                        'dateTo': end_date
                    }

                    response = self.session.get(
                        self.api_url,
                        params=params,
                        timeout=30
                    )
                    response.raise_for_status()

                    data = response.json()
                    releases = data.get('releases', [])

                    if not releases:
                        logger.info(f"No more releases found at page {page_number}")
                        break

                    logger.info(f"Page {page_number}: Found {len(releases)} releases")

                    for release in releases:
                        try:
                            tender = self._extract_tender_from_release(release)
                            if tender:
                                tenders.append(tender)
                                total_fetched += 1
                        except Exception as e:
                            logger.debug(f"Could not extract tender from release: {e}")
                            continue

                    # Check if more pages exist
                    pagination = data.get('pagination', {})
                    if not pagination.get('hasNext', False):
                        logger.info(f"Completed pagination at page {page_number}")
                        break

                    page_number += 1

                except requests.exceptions.Timeout:
                    logger.error(f"Timeout on page {page_number}, continuing...")
                    page_number += 1
                    continue
                except requests.exceptions.RequestException as e:
                    logger.error(f"Request error on page {page_number}: {e}")
                    break

        except Exception as e:
            logger.error(f"Error scraping eTenders: {e}")

        logger.info(f"Total tenders scraped from eTenders: {len(tenders)}")
        return tenders

    def _extract_tender_from_release(self, release):
        """Extract tender data from OCDS release"""
        try:
            # Get tender object from release
            tender = release.get('tender', {})
            if not tender:
                return None

            # Get procuring entity
            procuring_entity = tender.get('procuringEntity', {})
            buyer_name = procuring_entity.get('name', 'Unknown')

            # Get tender period
            tender_period = tender.get('tenderPeriod', {})
            closing_date_str = tender_period.get('endDate')

            # Parse closing date
            closing_date = self._parse_date(closing_date_str)

            # Get value/budget
            value = tender.get('value', {})
            budget = value.get('amount')

            # Get title and description
            title = tender.get('title', '')
            description = tender.get('description', '')

            # Get province
            province = tender.get('province', '')

            # Get category
            category = tender.get('mainProcurementCategory', '')

            # Get status
            status = tender.get('status', 'open')

            # Get documents
            documents = tender.get('documents', [])
            document_urls = [doc.get('url', '') for doc in documents if doc.get('url')]

            # Get OCID as reference number
            ocid = release.get('ocid', '')

            if not title or not ocid:
                return None

            return {
                'reference_number': ocid,
                'title': title[:500],
                'description': description[:2000],
                'closing_date': closing_date,
                'source_url': f'https://www.etenders.gov.za/Home/opportunities?id=1',
                'buyer': buyer_name,
                'province': province,
                'category': category,
                'status': status,
                'estimated_budget': budget,
                'document_urls': document_urls[:10]  # Limit to 10 docs
            }

        except Exception as e:
            logger.debug(f"Error extracting tender from release: {e}")
            return None

    def _parse_date(self, date_str):
        """Parse closing date from ISO format string and localize to SAST"""
        if not date_str:
            return None

        try:
            SAST = ZoneInfo('Africa/Johannesburg')

            # eTenders uses ISO 8601 format (YYYY-MM-DD or with time)
            if 'T' in date_str:
                # Has time component - parse as-is and convert to SAST
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                # Convert to SAST if timezone-aware
                if dt.tzinfo is not None:
                    dt = dt.astimezone(SAST)
                return dt
            else:
                # Date only - default to 11:00 SAST
                dt = datetime.strptime(date_str, '%Y-%m-%d')
                return dt.replace(hour=11, minute=0, second=0, tzinfo=SAST)
        except Exception as e:
            logger.debug(f"Could not parse date '{date_str}': {e}")
            return None

    def normalize_record(self, raw_record):
        """Normalize eTenders record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'description': raw_record.get('description'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'province': raw_record.get('province'),
                'category': raw_record.get('category'),
                'estimated_budget': raw_record.get('estimated_budget'),
                'document_urls': raw_record.get('document_urls', [])
            }
        except Exception as e:
            logger.error(f"Error normalizing eTenders record: {e}")
            return None


if __name__ == '__main__':
    collector = ETendersCollector()
    collector.collect()
    print("\n✅ eTenders collector completed")
    print("Data stored in Supabase rfqs table")
