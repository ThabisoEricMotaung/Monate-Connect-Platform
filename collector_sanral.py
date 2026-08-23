"""
South African National Roads Agency (SANRAL) tender collector.
Scrapes: https://www.nra.co.za/sanral-tenders/list/open-tenders
Uses Playwright for JavaScript rendering
"""

from collectors_base_supabase import TenderCollector
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import re
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


class SANRALCollector(TenderCollector):
    """SANRAL tender collector using Playwright for JS rendering"""

    def __init__(self):
        super().__init__(
            source_name='SANRAL',
            base_url='https://www.nra.co.za'
        )
        self.tender_list_url = 'https://www.nra.co.za/sanral-tenders/list/open-tenders'

    def scrape_listings(self):
        """Scrape SANRAL open tenders using Playwright"""
        tenders = []
        try:
            with sync_playwright() as p:
                # Launch headless browser
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()

                logger.info(f"Loading {self.tender_list_url}...")
                page.goto(self.tender_list_url, wait_until='networkidle', timeout=30000)

                # Wait for tender elements to load
                page.wait_for_selector('table tbody tr, div.tender-item, div[class*="tender"]', timeout=10000)

                # Get page content after rendering
                html_content = page.content()
                browser.close()

                # Parse with BeautifulSoup
                soup = BeautifulSoup(html_content, 'html.parser')

                # Find tender rows/items
                tender_elements = soup.find_all('tr')[1:]  # Skip header if table
                if not tender_elements:
                    tender_elements = soup.find_all('div', class_=re.compile(r'tender|item', re.I))

                logger.info(f"Found {len(tender_elements)} tender elements after rendering")

                for element in tender_elements:
                    try:
                        tender = self._extract_tender_from_element(element)
                        if tender:
                            tenders.append(tender)
                    except Exception as e:
                        logger.debug(f"Could not extract tender: {e}")
                        continue

        except Exception as e:
            logger.error(f"Error scraping SANRAL: {e}")

        return tenders

    def _extract_tender_from_element(self, element):
        """Extract tender from table row or div"""
        text = element.get_text()

        # Skip empty elements
        if len(text.strip()) < 10:
            return None

        # Extract reference number
        cells = element.find_all('td')
        if cells:
            # Table format: assume first cell is reference
            reference_number = cells[0].get_text().strip()
            title = cells[1].get_text().strip() if len(cells) > 1 else reference_number
            closing_date_str = cells[-1].get_text().strip() if len(cells) > 2 else None
        else:
            # Div format: parse text
            ref_match = re.search(r'([\d\-/]+)', text)
            if not ref_match:
                return None
            reference_number = ref_match.group(1)
            title = text[:100]
            closing_date_str = None

        if not reference_number or reference_number == '':
            return None

        # Parse closing date
        closing_date = self._parse_date(closing_date_str or text)

        return {
            'reference_number': reference_number,
            'title': title[:200],
            'closing_date': closing_date,
            'source_url': self.tender_list_url,
            'buyer': 'South African National Roads Agency',
            'document_urls': []
        }

    def _parse_date(self, date_str):
        """Parse closing date from string"""
        if not date_str:
            return None

        try:
            # Try various date formats
            formats = [
                '%Y-%m-%d',
                '%d/%m/%Y',
                '%d %B %Y',
                '%d %b %Y',
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(date_str.strip(), fmt)
                except ValueError:
                    continue

        except Exception as e:
            logger.debug(f"Could not parse date '{date_str}': {e}")

        return None

    def normalize_record(self, raw_record):
        """Normalize SANRAL record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'document_urls': raw_record.get('document_urls', [])
            }
        except Exception as e:
            logger.error(f"Error normalizing SANRAL record: {e}")
            return None


if __name__ == '__main__':
    collector = SANRALCollector()
    collector.collect()

    print("\n✅ SANRAL collector completed")
    print("Data stored in Supabase rfqs table")
