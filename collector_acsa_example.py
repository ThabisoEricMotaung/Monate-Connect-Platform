from collectors_base import TenderCollector
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)


class ACSACollector(TenderCollector):
    """Airports Company South Africa tender collector"""

    def __init__(self, db_params):
        super().__init__(
            source_name='ACSA',
            base_url='https://www.acsa.co.za',
            db_params=db_params
        )
        self.tender_list_url = 'https://www.acsa.co.za/tenders'  # Verify URL from assessment

    def scrape_listings(self):
        """Scrape ACSA tender listing page (simple HTML table)"""
        tenders = []
        try:
            response = self.session.get(self.tender_list_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find tender table (adjust selector based on actual site structure)
            table = soup.find('table', class_='tenders-table')
            if not table:
                logger.warning("Could not find tenders table on ACSA site")
                return tenders

            rows = table.find_all('tr')[1:]  # Skip header row
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 5:  # Ensure enough columns
                    tenders.append({
                        'reference_number': cols[0].text.strip(),
                        'title': cols[1].text.strip(),
                        'category': cols[2].text.strip(),
                        'issue_date': cols[3].text.strip(),
                        'closing_date': cols[4].text.strip(),
                        'document_link': cols[5].find('a').get('href') if cols[5].find('a') else None
                    })

        except Exception as e:
            logger.error(f"Error scraping ACSA: {e}")

        return tenders

    def normalize_record(self, raw_record):
        """Normalize ACSA record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'category': raw_record.get('category'),
                'closing_date': raw_record.get('closing_date'),  # Parse to datetime later
                'source_url': self.tender_list_url,
                'document_urls': [raw_record.get('document_link')] if raw_record.get('document_link') else []
            }
        except Exception as e:
            logger.error(f"Error normalizing ACSA record: {e}")
            return None


if __name__ == '__main__':
    db_params = {
        'host': 'localhost',
        'database': 'aiform_procure',
        'user': 'postgres',
        'password': 'your_password'
    }

    collector = ACSACollector(db_params)
    collector.collect()
