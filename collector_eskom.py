"""
Eskom Tender Bulletin collector.
Scrapes: https://tenderbulletin.eskom.co.za/search
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


class EskomCollector(TenderCollector):
    """Eskom Tender Bulletin collector using Playwright for JS rendering"""

    def __init__(self):
        super().__init__(
            source_name='Eskom',
            base_url='https://tenderbulletin.eskom.co.za'
        )
        self.search_url = 'https://tenderbulletin.eskom.co.za/search'

    def scrape_listings(self, max_pages=50, days_back=90):
        """Scrape Eskom tenders using Playwright for JavaScript rendering

        Args:
            max_pages: Maximum number of pages to scrape (default 50 = ~5000 tenders)
            days_back: Only keep tenders published in last N days (default 90 days)
        """
        tenders = []
        cutoff_date = datetime.now(ZoneInfo('Africa/Johannesburg')) - __import__('datetime').timedelta(days=days_back)

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page_obj = browser.new_page()

                # Start with page 1
                url = f"{self.search_url}?page=1&pageSize=100"
                logger.info(f"Loading {url}...")
                page_obj.goto(url, wait_until='domcontentloaded', timeout=30000)

                # Wait for articles to render
                page_obj.wait_for_timeout(3000)

                page_num = 1
                while page_num <= max_pages:
                    logger.info(f"Extracting tenders from page {page_num}/{max_pages}...")

                    # Get page content after rendering
                    html_content = page_obj.content()

                    # Debug: save HTML for inspection
                    if page_num == 1:
                        with open('eskom_debug.html', 'w', encoding='utf-8') as f:
                            f.write(html_content)
                        logger.info(f"DEBUG: Saved page HTML to eskom_debug.html ({len(html_content)} bytes)")

                    soup = BeautifulSoup(html_content, 'html.parser')

                    # Find all tender articles
                    articles = soup.find_all('article')
                    logger.info(f"Found {len(articles)} <article> elements on page {page_num}")

                    if not articles:
                        # Check what else is on the page
                        lists = soup.find_all('ul')
                        logger.info(f"DEBUG: Found {len(lists)} <ul>, {len(soup.find_all('li'))} <li>")

                    if not articles:
                        logger.info(f"No more tenders found, stopping pagination")
                        break

                    for article in articles:
                        try:
                            tender = self._extract_tender_from_article(article)
                            if tender:
                                # Skip if tender has already closed
                                if tender.get('closing_date') and tender['closing_date'] < datetime.now(ZoneInfo('Africa/Johannesburg')):
                                    logger.debug(f"Skipping closed tender: {tender.get('reference_number')}")
                                    continue
                                tenders.append(tender)
                        except Exception as e:
                            logger.debug(f"Error extracting tender: {e}")
                            continue

                    # Try to click next page or navigate to next page
                    page_num += 1
                    next_url = f"{self.search_url}?page={page_num}&pageSize=100"

                    try:
                        page_obj.goto(next_url, wait_until='domcontentloaded', timeout=30000)
                        page_obj.wait_for_timeout(2000)
                    except Exception as e:
                        logger.info(f"Could not load page {page_num}: {e}")
                        break

                browser.close()

        except Exception as e:
            logger.error(f"Error scraping Eskom: {e}")

        logger.info(f"Total Eskom tenders scraped: {len(tenders)} (max {max_pages} pages, last {days_back} days)")
        return tenders

    def _extract_tender_from_article(self, article):
        """Extract tender data from article element"""

        # Extract reference number (e.g., E3112GXMPKUS)
        ref_elem = article.find('h2') or article.find('h3')
        if not ref_elem:
            return None

        reference_number = ref_elem.get_text().strip()
        if not reference_number:
            return None

        # Check for cancellation/withdrawal markers
        article_text = article.get_text()
        if any(keyword in article_text.upper() for keyword in ['CANCEL', 'WITHDRAWN', 'REGRET']):
            logger.debug(f"Skipping cancelled tender: {reference_number}")
            return None

        # Extract all text for parsing
        text = article.get_text()

        # Extract description (usually the second generic element)
        description = None
        generics = article.find_all(class_='font-semibold') or article.find_all(string=lambda x: x and len(x.strip()) > 20)
        if generics and len(generics) > 1:
            description = generics[1].get_text().strip()
        else:
            # Fallback: use first substantial text after reference
            for elem in article.find_all(string=True):
                elem_text = elem.strip()
                if elem_text and elem_text != reference_number and len(elem_text) > 20 and len(elem_text) < 500:
                    description = elem_text
                    break

        # Extract division (GENERATION, DISTRIBUTION, etc.)
        division = None
        division_match = re.search(r'(GENERATION|DISTRIBUTION|TRANSMISSION|TRADING|CORPORATE)', article_text, re.I)
        if division_match:
            division = division_match.group(1).upper()

        # Extract location
        location = None
        location_labels = ['Location', 'Kusile', 'Lethabo', 'Witbank', 'Duvha', 'Groote', 'Medupi', 'Kendal']
        for label in location_labels:
            if label.lower() in article_text.lower():
                # Try to extract the line containing this location
                for line in article_text.split('\n'):
                    if label.lower() in line.lower() and len(line.strip()) < 200:
                        location = line.strip()
                        break

        # Extract closing date (format: "2026-Aug-24 10:00:00" or similar)
        closing_date = self._extract_date(article_text)

        # Extract published date if available
        published_date = None
        published_match = re.search(r'Published.*?(\d{4}-\w{3}-\d{2})', article_text, re.I)
        if published_match:
            try:
                published_date = datetime.strptime(published_match.group(1), '%Y-%b-%d')
            except:
                pass

        # Extract document download link
        doc_link = None
        doc_url_elem = article.find('a', href=re.compile(r'Files/DownloadAll'))
        if doc_url_elem:
            doc_link = doc_url_elem.get('href', '')
            if not doc_link.startswith('http'):
                doc_link = self.base_url + doc_link

        # Extract eTendering link
        etendering_link = None
        etendering_elem = article.find('a', href=re.compile(r'etendering\.eskom\.co\.za'))
        if etendering_elem:
            etendering_link = etendering_elem.get('href', '')

        # Extract tender detail page link
        tender_link = None
        tender_elem = article.find('a', href=re.compile(r'^/tender/'))
        if tender_elem:
            tender_href = tender_elem.get('href', '')
            tender_link = self.base_url + tender_href

        return {
            'reference_number': reference_number,
            'title': description[:200] if description else reference_number,
            'description': description,
            'closing_date': closing_date,
            'published_date': published_date,
            'source_url': tender_link or self.search_url,
            'buyer': 'Eskom Holdings SOC Ltd',
            'division': division,
            'location': location,
            'document_urls': [doc_link] if doc_link else [],
            'external_link': etendering_link
        }

    def _extract_date(self, text):
        """Extract and parse closing date from text"""
        SAST = ZoneInfo('Africa/Johannesburg')

        # Look for "Closing Date" pattern followed by date/time
        date_patterns = [
            r'Closing\s+Date\s*[\:\-]?\s*(\d{4}-\w{3}-\d{2}\s+\d{1,2}:\d{2}:\d{2})',  # 2026-Aug-24 10:00:00
            r'(\d{4}-\w{3}-\d{2}\s+\d{1,2}:\d{2}:\d{2})',  # Just the datetime
            r'(\d{4}-\w{3}-\d{2})',  # Just the date
            r'(\d{1,2}\s+\w{3}\s+\d{4})',  # 24 Aug 2026
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                date_str = match.group(1).strip()
                try:
                    # Try with time first (ISO-like format)
                    if len(date_str) > 10:
                        dt = datetime.strptime(date_str, '%Y-%b-%d %H:%M:%S')
                    else:
                        # Date only - default to 11:00 SAST
                        dt = datetime.strptime(date_str, '%Y-%b-%d')
                        dt = dt.replace(hour=11, minute=0, second=0)

                    # Localize to SAST
                    return dt.replace(tzinfo=SAST)

                except ValueError:
                    continue

        return None

    def normalize_record(self, raw_record):
        """Normalize Eskom record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'description': raw_record.get('description'),
                'closing_date': raw_record.get('closing_date'),
                'published_date': raw_record.get('published_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'division': raw_record.get('division'),
                'location': raw_record.get('location'),
                'document_urls': raw_record.get('document_urls', []),
                'external_link': raw_record.get('external_link')
            }
        except Exception as e:
            logger.error(f"Error normalizing Eskom record: {e}")
            return None


if __name__ == '__main__':
    collector = EskomCollector()
    collector.collect()

    print("\n✅ Eskom collector completed")
    print("Data stored in Supabase rfqs table")
