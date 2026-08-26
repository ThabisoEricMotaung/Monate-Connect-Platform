"""
City of Cape Town tender collector.
Scrapes: https://web1.capetown.gov.za/web1/tenderportal/Tender
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


class CapeownCollector(TenderCollector):
    """City of Cape Town tender collector using Playwright for JS rendering"""

    def __init__(self):
        super().__init__(
            source_name='City of Cape Town',
            base_url='https://web1.capetown.gov.za'
        )
        self.tender_list_url = 'https://web1.capetown.gov.za/web1/tenderportal/Tender'

    def scrape_listings(self, max_pages=50, days_back=90):
        """Scrape Cape Town tenders using Playwright for JavaScript rendering

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

                # Wait for table to render
                page_obj.wait_for_timeout(3000)

                page_num = 1
                found_on_this_page = 0
                found_total = 0

                while page_num <= max_pages:
                    logger.info(f"Extracting tenders from page {page_num}/{max_pages}...")

                    # Get page content after rendering
                    html_content = page_obj.content()

                    # Debug: save HTML for inspection
                    if page_num == 1:
                        with open('capetown_debug.html', 'w', encoding='utf-8') as f:
                            f.write(html_content)
                        logger.info(f"DEBUG: Saved page HTML to capetown_debug.html ({len(html_content)} bytes)")

                    soup = BeautifulSoup(html_content, 'html.parser')

                    # Find all tender rows in table
                    table = soup.find('table')
                    if not table:
                        logger.info(f"No table found, stopping pagination")
                        break

                    rows = table.find_all('tr')[1:]  # Skip header row
                    logger.info(f"Found {len(rows)} tender rows on page {page_num}")

                    if not rows:
                        logger.info(f"No more tenders found, stopping pagination")
                        break

                    found_on_this_page = 0
                    for row in rows:
                        try:
                            tender = self._extract_tender_from_row(row)
                            if tender:
                                # Check if published date is within cutoff
                                if tender.get('published_date') and tender['published_date'] < cutoff_date:
                                    logger.debug(f"Skipping old tender (published {tender['published_date']}): {tender.get('reference_number')}")
                                    continue
                                tenders.append(tender)
                                found_on_this_page += 1
                                found_total += 1
                        except Exception as e:
                            logger.debug(f"Error extracting tender: {e}")
                            continue

                    logger.info(f"  → Added {found_on_this_page} new tenders from this page (total: {found_total})")

                    # Try to find and click next page button
                    page_num += 1
                    try:
                        # Look for next page link or button
                        next_btn = page_obj.locator('a:has-text("Next"), button:has-text("Next"), a[aria-label*="Next"]')
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
            logger.error(f"Error scraping Cape Town: {e}")

        logger.info(f"Total Cape Town tenders scraped: {len(tenders)} (max {max_pages} pages, last {days_back} days)")
        return tenders

    def _extract_tender_from_row(self, row):
        """Extract tender data from table row"""
        cells = row.find_all('td')

        if len(cells) < 6:
            return None

        try:
            # Extract fields from table columns
            # Expected order: Reference, Title, Directorate, Department, Closing Date, Closing Time, Published Date, Published Time
            reference_number = cells[0].get_text().strip()
            title = cells[1].get_text().strip()
            directorate = cells[2].get_text().strip() if len(cells) > 2 else None
            department = cells[3].get_text().strip() if len(cells) > 3 else None
            closing_date_str = cells[4].get_text().strip() if len(cells) > 4 else None
            closing_time_str = cells[5].get_text().strip() if len(cells) > 5 else None
            published_date_str = cells[6].get_text().strip() if len(cells) > 6 else None

            if not reference_number or not title:
                return None

            # Parse closing date with time
            closing_date = self._parse_datetime(closing_date_str, closing_time_str)

            # Parse published date
            published_date = None
            if published_date_str:
                published_date = self._parse_date(published_date_str)

            # Check for cancellation in title or reference
            combined_text = f"{reference_number} {title} {directorate or ''}".upper()
            if any(keyword in combined_text for keyword in ['CANCEL', 'WITHDRAWN', 'REGRET']):
                logger.debug(f"Skipping cancelled tender: {reference_number}")
                return None

            # Skip if already expired
            if closing_date:
                SAST = ZoneInfo('Africa/Johannesburg')
                now = datetime.now(SAST)
                if closing_date < now:
                    logger.debug(f"Skipping expired tender: {reference_number} (closed: {closing_date})")
                    return None

            return {
                'reference_number': reference_number,
                'title': title[:200],
                'description': title,
                'closing_date': closing_date,
                'published_date': published_date,
                'source_url': self.tender_list_url,
                'buyer': 'City of Cape Town Metropolitan Municipality',
                'directorate': directorate,
                'department': department,
                'document_urls': []
            }

        except Exception as e:
            logger.debug(f"Error extracting tender from row: {e}")
            return None

    def _parse_datetime(self, date_str, time_str):
        """Parse closing date and time from separate strings"""
        SAST = ZoneInfo('Africa/Johannesburg')

        if not date_str:
            return None

        try:
            # Parse date (YYYY-MM-DD format)
            date_obj = datetime.strptime(date_str.strip(), '%Y-%m-%d')

            # Parse time if provided
            time_part = None
            if time_str:
                time_str = time_str.strip()
                # Handle formats like "10:00 AM", "16:00 PM", "10:00AM", "16:00PM"
                time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)', time_str)
                if time_match:
                    hour = int(time_match.group(1))
                    minute = int(time_match.group(2))
                    am_pm = time_match.group(3).upper()

                    # Convert to 24-hour format
                    if am_pm == 'PM' and hour != 12:
                        hour += 12
                    elif am_pm == 'AM' and hour == 12:
                        hour = 0

                    time_part = (hour, minute)

            if time_part:
                dt = date_obj.replace(hour=time_part[0], minute=time_part[1], second=0)
            else:
                # Default to 11:00 SAST if no time provided
                dt = date_obj.replace(hour=11, minute=0, second=0)

            # Localize to SAST
            return dt.replace(tzinfo=SAST)

        except Exception as e:
            logger.debug(f"Could not parse datetime '{date_str}' '{time_str}': {e}")
            return None

    def _parse_date(self, date_str):
        """Parse date from string (no time component)"""
        if not date_str:
            return None

        try:
            return datetime.strptime(date_str.strip(), '%Y-%m-%d')
        except ValueError:
            logger.debug(f"Could not parse date '{date_str}'")
            return None

    def normalize_record(self, raw_record):
        """Normalize Cape Town record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'description': raw_record.get('description'),
                'closing_date': raw_record.get('closing_date'),
                'published_date': raw_record.get('published_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'directorate': raw_record.get('directorate'),
                'department': raw_record.get('department'),
                'document_urls': raw_record.get('document_urls', [])
            }
        except Exception as e:
            logger.error(f"Error normalizing Cape Town record: {e}")
            return None


if __name__ == '__main__':
    collector = CapeownCollector()
    collector.collect()

    print("\n✅ City of Cape Town collector completed")
    print("Data stored in Supabase rfqs table")
