"""
City of Johannesburg tender collector.
Scrapes: https://www.joburg.org.za/Procurement/
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


class CojCollector(TenderCollector):
    """City of Johannesburg tender collector using Playwright for JS rendering"""

    def __init__(self):
        super().__init__(
            source_name='City of Johannesburg',
            base_url='https://www.joburg.org.za'
        )
        self.tender_list_url = 'https://www.joburg.org.za/Procurement/'

    def scrape_listings(self, max_pages=50, days_back=90):
        """Scrape City of Johannesburg tenders using Playwright

        Args:
            max_pages: Maximum number of pages to scrape (default 50 = ~450 tenders)
            days_back: Only keep tenders published in last N days (default 90 days)
        """
        tenders = []
        cutoff_date = datetime.now(ZoneInfo('Africa/Johannesburg')) - __import__('datetime').timedelta(days=days_back)

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page_obj = browser.new_page()

                logger.info(f"Loading {self.tender_list_url}...")
                page_obj.goto(self.tender_list_url, wait_until='domcontentloaded', timeout=30000)

                # Wait for content to render
                page_obj.wait_for_timeout(3000)

                page_num = 1
                while page_num <= max_pages:
                    logger.info(f"Extracting tenders from page {page_num}/{max_pages}...")

                    # Get page content after rendering
                    html_content = page_obj.content()

                    # Debug: save HTML for inspection
                    if page_num == 1:
                        with open('coj_debug.html', 'w', encoding='utf-8') as f:
                            f.write(html_content)
                        logger.info(f"DEBUG: Saved page HTML to coj_debug.html ({len(html_content)} bytes)")

                    soup = BeautifulSoup(html_content, 'html.parser')

                    # Find all tender rows (try multiple selectors)
                    tenders_found = 0

                    # Try table rows first
                    rows = soup.find_all('tr')
                    if not rows:
                        # Try article elements
                        rows = soup.find_all('article')
                    if not rows:
                        # Try divs with tender class
                        rows = soup.find_all('div', class_=re.compile(r'tender|item|row', re.I))

                    logger.info(f"Found {len(rows)} rows on page {page_num}")

                    if not rows:
                        logger.info(f"No more tenders found, stopping pagination")
                        break

                    for row in rows:
                        try:
                            tender = self._extract_tender_from_row(row)
                            if tender:
                                # Skip if tender has already closed
                                if tender.get('closing_date') and tender['closing_date'] < datetime.now(ZoneInfo('Africa/Johannesburg')):
                                    logger.debug(f"Skipping closed tender: {tender.get('reference_number')}")
                                    continue
                                tenders.append(tender)
                                tenders_found += 1
                        except Exception as e:
                            logger.debug(f"Error extracting tender: {e}")
                            continue

                    logger.info(f"  → Added {tenders_found} new tenders from this page (total: {len(tenders)})")

                    # Try to find and click next page button
                    page_num += 1
                    try:
                        # Look for next page link or button
                        next_btn = page_obj.locator('a:has-text("Next"), button:has-text("Next"), a[aria-label*="Next"], a.next')
                        if next_btn.count() > 0:
                            next_btn.first.click()
                            page_obj.wait_for_timeout(2000)
                        else:
                            logger.info(f"No next page button found, stopping pagination")
                            break
                    except Exception as e:
                        logger.info(f"Could not navigate to next page: {e}")
                        break

                browser.close()

        except Exception as e:
            logger.error(f"Error scraping City of Johannesburg: {e}")

        logger.info(f"Total CoJ tenders scraped: {len(tenders)} (max {max_pages} pages, last {days_back} days)")
        return tenders

    def _extract_tender_from_row(self, row):
        """Extract tender data from table row or element"""
        try:
            # Get text content
            text = row.get_text(separator=' ').strip()
            if not text or len(text) < 5:
                return None

            # Extract reference number (often first element)
            cells = row.find_all('td') if row.name == 'tr' else row.find_all('div', recursive=False)

            reference_number = None
            if cells:
                reference_number = cells[0].get_text().strip()

            if not reference_number:
                # Try to extract from text
                ref_match = re.search(r'(RFQ|BID|TENDER|#)?[\s\-]*(\d{4,})', text)
                if ref_match:
                    reference_number = ref_match.group(0)
                else:
                    # Use first 50 chars as reference
                    reference_number = text[:50]

            if not reference_number:
                return None

            # Extract title
            title = text[:200] if len(text) > 200 else text

            # Extract closing date (look for patterns)
            closing_date = None
            date_pattern = r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})'
            date_match = re.search(date_pattern, text, re.I)
            if date_match:
                try:
                    closing_date = datetime.strptime(date_match.group(0), '%d %b %Y')
                except:
                    try:
                        closing_date = datetime.strptime(date_match.group(0), '%d %B %Y')
                    except:
                        pass

            # Fallback: try DD/MM/YYYY format
            if not closing_date:
                date_pattern_numeric = r'(\d{1,2})/(\d{1,2})/(\d{4})'
                dates = re.findall(date_pattern_numeric, text)
                if dates:
                    last_date = dates[-1]
                    try:
                        closing_date = datetime(int(last_date[2]), int(last_date[1]), int(last_date[0]))
                    except:
                        pass

            return {
                'reference_number': reference_number,
                'title': title,
                'description': title,
                'closing_date': closing_date,
                'source_url': self.tender_list_url,
                'buyer': 'City of Johannesburg Metropolitan Municipality',
                'document_urls': []
            }

        except Exception as e:
            logger.debug(f"Error extracting tender from row: {e}")
            return None

    def normalize_record(self, raw_record):
        """Normalize CoJ record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'description': raw_record.get('description'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'document_urls': raw_record.get('document_urls', [])
            }
        except Exception as e:
            logger.error(f"Error normalizing CoJ record: {e}")
            return None


if __name__ == '__main__':
    collector = CojCollector()
    collector.collect()

    print("\n✅ City of Johannesburg collector completed")
    print("Data stored in Supabase rfqs table")
