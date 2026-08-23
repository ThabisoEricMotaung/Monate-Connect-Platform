"""
South African National Roads Agency (SANRAL) tender collector.
Scrapes: https://www.nra.co.za/sanral-tenders/list/open-tenders
Uses Playwright for JavaScript rendering
"""

from collectors_base_supabase import TenderCollector
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
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
                page.goto(self.tender_list_url, wait_until='domcontentloaded', timeout=30000)

                # Wait longer for content to fully render
                page.wait_for_timeout(3000)

                # Try waiting for common tender container selectors
                try:
                    page.wait_for_selector('a[href*="sanral-tenders"]', timeout=5000)
                except:
                    logger.debug("Tender links not found with default selector, continuing...")

                # Get page content after rendering
                html_content = page.content()
                browser.close()

                # Parse with BeautifulSoup
                soup = BeautifulSoup(html_content, 'html.parser')

                # Strategy 1: Find all links that point to tender detail pages
                tender_links = soup.find_all('a', href=re.compile(r'/sanral-tenders/.*', re.I))
                tender_elements = []

                if tender_links:
                    logger.info(f"Found {len(tender_links)} tender links")
                    tender_elements = tender_links
                else:
                    # Strategy 2: Look for table rows
                    tender_elements = soup.find_all('tr')[1:]  # Skip header
                    if tender_elements:
                        logger.info(f"Found {len(tender_elements)} table rows")
                    else:
                        # Strategy 3: Look for divs with tender/item classes
                        tender_elements = soup.find_all('div', class_=re.compile(r'tender|item|contract', re.I))
                        if tender_elements:
                            logger.info(f"Found {len(tender_elements)} tender divs")

                logger.info(f"Total tender elements found: {len(tender_elements)}")

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
        """Extract tender from link, table row, or div"""
        text = element.get_text().strip()

        # Skip empty elements
        if len(text) < 5:
            return None

        reference_number = None
        title = None
        closing_date = None
        closing_date_str = None

        # Handle link elements (tender detail pages)
        if element.name == 'a':
            href = element.get('href', '')
            title = text
            # Try to extract reference from href or text
            ref_match = re.search(r'(N\.\d{3}-\d{3}-\d{4}/\d+)', text)
            if ref_match:
                reference_number = ref_match.group(1)
            else:
                # Use first few words of title as reference
                reference_number = text[:50]
        else:
            # Handle table cells
            cells = element.find_all('td')
            if cells and len(cells) >= 2:
                # Table format
                reference_number = cells[0].get_text().strip()
                title = cells[1].get_text().strip()
                closing_date_str = cells[-1].get_text().strip() if len(cells) > 2 else None
            else:
                # Div/text format: parse text for reference and date
                ref_match = re.search(r'(N\.\d{3}-\d{3}-\d{4}/\d+|[\d\-/]{5,})', text)
                if ref_match:
                    reference_number = ref_match.group(1)

                # Use full text as title if not found above
                if not title:
                    title = text[:200]

        if not reference_number or reference_number == '':
            return None

        # Parse closing date from text or specific field
        closing_date = self._parse_date(closing_date_str or text)

        # Skip expired tenders (closing date in the past)
        if closing_date and closing_date < datetime.now():
            logger.debug(f"Skipping expired SANRAL tender: {reference_number} (closed {closing_date.date()})")
            return None

        return {
            'reference_number': reference_number[:100],
            'title': title[:500] if title else reference_number,
            'closing_date': closing_date,
            'source_url': self.tender_list_url,
            'buyer': 'South African National Roads Agency',
            'document_urls': []
        }

    def _parse_date(self, date_str):
        """Parse closing date from string and localize to SAST timezone"""
        if not date_str:
            return None

        try:
            cleaned = date_str.strip()
            SAST = ZoneInfo('Africa/Johannesburg')

            # Try various date formats (date only)
            date_formats = [
                '%Y-%m-%d',
                '%Y/%m/%d',
                '%d/%m/%Y',
                '%d-%m-%Y',
                '%d %B %Y',
                '%d %b %Y',
                '%B %d, %Y',
                '%b %d, %Y',
                '%d %B, %Y',
                '%Y%m%d',
            ]

            # Try formats with time
            datetime_formats = [
                '%Y-%m-%d %H:%M:%S',
                '%d/%m/%Y %H:%M:%S',
                '%d-%m-%Y %H:%M:%S',
                '%d %B %Y %H:%M:%S',
                '%d %b %Y %H:%M:%S',
            ]

            # Try datetime formats first
            for fmt in datetime_formats:
                try:
                    dt = datetime.strptime(cleaned, fmt)
                    # Localize to SAST
                    return dt.replace(tzinfo=SAST)
                except ValueError:
                    continue

            # Try date-only formats and default to 11:00 AM SAST (standard SA public sector closing time)
            for fmt in date_formats:
                try:
                    dt = datetime.strptime(cleaned, fmt)
                    # Set time to 11:00 SAST (standard closing time) and localize
                    dt = dt.replace(hour=11, minute=0, second=0, tzinfo=SAST)
                    return dt
                except ValueError:
                    continue

            # If none worked, log and return None
            logger.debug(f"Could not parse date '{date_str}' with any known format")

        except Exception as e:
            logger.debug(f"Error parsing date '{date_str}': {e}")

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
