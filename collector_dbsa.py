"""
Development Bank of Southern Africa (DBSA) tender collector.
Scrapes: https://www.dbsa.org/procurement
"""

from collectors_base_supabase import TenderCollector
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import re
import pdfplumber
import io

logger = logging.getLogger(__name__)


class DBSACollector(TenderCollector):
    """DBSA tender collector"""

    def __init__(self):
        super().__init__(
            source_name='DBSA',
            base_url='https://www.dbsa.org'
        )
        self.tender_list_url = 'https://www.dbsa.org/procurement'

    def scrape_listings(self):
        """Scrape DBSA procurement page"""
        tenders = []
        try:
            response = self.session.get(self.tender_list_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find the tender table
            table = soup.find('table')
            if not table:
                logger.warning("No table found on DBSA procurement page")
                return tenders

            # Parse table rows
            rows = table.find_all('tr')[1:]  # Skip header
            logger.info(f"Found {len(rows)} tender rows")

            for row in rows:
                try:
                    tender = self._extract_from_row(row)
                    if tender:
                        tenders.append(tender)
                except Exception as e:
                    logger.warning(f"Error parsing row: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error scraping DBSA: {e}")

        return tenders

    def _extract_from_row(self, row):
        """Extract tender data from table row"""
        cols = row.find_all('td')
        if len(cols) < 3:
            return None

        # Column 0: Reference + Title + Links
        col0_text = cols[0].get_text()
        col0_html = str(cols[0])

        # Extract reference number (RFP XXX/YYYY or RFQ XXX/YYYY)
        ref_match = re.search(r'(RFP|RFQ)\s*(\d+[/\-\s]*\d*)', col0_text, re.I)
        if not ref_match:
            return None

        reference_number = ref_match.group(0).strip()

        # Extract title and description (text between reference and links)
        # Remove the reference part to get full text
        full_text = col0_text.replace(reference_number, '').strip()

        # Extract description (everything before briefing info)
        description = re.sub(r'Compulsory.*?Microsoft Teams', '', full_text, flags=re.I | re.DOTALL).strip()

        # Title is first line of description
        lines = description.split('\n')
        title_text = lines[0].strip() if lines else reference_number

        # Description is everything else (up to first link text)
        if len(lines) > 1:
            description = '\n'.join(lines[1:]).strip()[:500]  # Limit to 500 chars
        else:
            description = None

        if not title_text:
            title_text = reference_number

        # Column 1: Date Published
        published_date_str = cols[1].get_text().strip() if len(cols) > 1 else None

        # Column 2: Closing Date
        closing_date_str = cols[2].get_text().strip() if len(cols) > 2 else None

        # Parse closing date (e.g., "7 September 2026 at 23H55")
        closing_date = self._parse_date(closing_date_str)

        # Extract document links
        doc_links = []
        pdf_url = None
        for link in cols[0].find_all('a'):
            href = link.get('href', '')
            if href:
                doc_links.append(href)
                # Grab first PDF/document link for description extraction
                if not pdf_url and ('.pdf' in href.lower() or 'download' in href.lower()):
                    pdf_url = href if href.startswith('http') else self.base_url + href

        # Extract budget if available
        estimated_budget = self._extract_budget(col0_text)

        # Try to get PDF description if no description exists
        if not description and pdf_url:
            description = self._extract_pdf_text(pdf_url)

        return {
            'reference_number': reference_number,
            'title': title_text[:200],
            'description': description,
            'closing_date': closing_date,
            'source_url': self.tender_list_url,
            'buyer': 'Development Bank of Southern Africa',
            'document_urls': doc_links,
            'estimated_budget': estimated_budget
        }

    def _extract_budget(self, text):
        """Extract estimated budget from text"""
        if not text:
            return None

        # Look for currency amounts: R xxx,xxx or ZAR xxx,xxx
        budget_patterns = [
            r'[Rr]\s*([\d\s,]+)\s*(?:million|m|bn|billion)',
            r'[Rr]\s*([\d,]+)',
            r'ZAR\s*([\d,]+)',
        ]

        for pattern in budget_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '').replace(' ', '')
                    amount = float(amount_str)

                    # Handle millions/billions
                    if 'million' in match.group(0).lower() or 'm' in match.group(0).lower():
                        amount *= 1_000_000
                    elif 'billion' in match.group(0).lower() or 'bn' in match.group(0).lower():
                        amount *= 1_000_000_000

                    return amount if amount > 0 else None
                except (ValueError, AttributeError):
                    continue

        return None

    def _extract_pdf_text(self, pdf_url):
        """Extract text from PDF URL"""
        if not pdf_url:
            return None

        try:
            response = self.session.get(pdf_url, timeout=15)
            response.raise_for_status()

            # Parse PDF from bytes
            pdf_file = io.BytesIO(response.content)
            with pdfplumber.open(pdf_file) as pdf:
                text = ''
                # Extract from first 3 pages to avoid huge documents
                for page in pdf.pages[:3]:
                    text += page.extract_text() or ''
                    if len(text) > 1000:  # Stop if we have enough
                        break

            return text.strip()[:500] if text else None

        except Exception as e:
            logger.warning(f"Could not extract PDF from {pdf_url}: {e}")
            return None

    def _parse_date(self, date_str):
        """Parse date string like '7 September 2026 at 23H55'"""
        if not date_str:
            return None

        try:
            # Remove time part
            date_part = re.sub(r'\s+at\s+.*', '', date_str).strip()
            # Parse date
            return datetime.strptime(date_part, '%d %B %Y')
        except Exception as e:
            logger.warning(f"Could not parse date '{date_str}': {e}")
            return None

    def normalize_record(self, raw_record):
        """Normalize DBSA record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'description': raw_record.get('description'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'document_urls': raw_record.get('document_urls', []),
                'estimated_budget': raw_record.get('estimated_budget')
            }
        except Exception as e:
            logger.error(f"Error normalizing DBSA record: {e}")
            return None


if __name__ == '__main__':
    collector = DBSACollector()
    collector.collect()

    print("\n✅ DBSA collector completed")
    print("Data stored in Supabase rfqs table")
