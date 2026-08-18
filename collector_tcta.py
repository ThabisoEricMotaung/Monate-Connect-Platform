"""
Trans-Caledon Tunnel Authority (TCTA) tender collector.
Scrapes: https://www.tcta.co.za/tenders/
"""

from collectors_base_supabase import TenderCollector
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)


class TCTACollector(TenderCollector):
    """TCTA tender collector"""

    def __init__(self):
        super().__init__(
            source_name='TCTA',
            base_url='https://www.tcta.co.za'
        )
        self.tender_list_url = 'https://www.tcta.co.za/tenders/'

    def scrape_listings(self):
        """Scrape TCTA tenders page"""
        tenders = []
        try:
            response = self.session.get(self.tender_list_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find main content
            main = soup.find('main')
            if not main:
                logger.warning("No main content found")
                return tenders

            # Find list items or divs with tender content
            lists = main.find_all(['ul', 'ol'], limit=5)

            if lists:
                # Process list items
                for list_elem in lists:
                    items = list_elem.find_all('li', recursive=False)
                    logger.info(f"Found {len(items)} list items")

                    for item in items:
                        try:
                            tender = self._extract_from_item(item)
                            if tender:
                                tenders.append(tender)
                        except Exception as e:
                            logger.warning(f"Error parsing item: {e}")
                            continue

            # Fallback: search for tender reference patterns in text
            if not tenders:
                logger.info("No list items found, searching by text patterns")
                tenders = self._extract_by_pattern(main)

        except Exception as e:
            logger.error(f"Error scraping TCTA: {e}")

        return tenders

    def _extract_from_item(self, item):
        """Extract tender from list item"""
        text = item.get_text()

        # Look for tender reference (Tender No XXX/YYYY/...)
        ref_match = re.search(r'Tender\s+No\.?\s+([\d/\w\-]+)', text, re.I)
        if not ref_match:
            return None

        reference_number = ref_match.group(1).strip()

        # Extract title (everything before tender number)
        title_text = text[:text.find(ref_match.group(0))].strip()
        if not title_text:
            # If no text before, use the reference
            title_text = reference_number

        # Try to extract closing date if present
        closing_date = self._extract_date(text)

        return {
            'reference_number': reference_number,
            'title': title_text[:200],
            'closing_date': closing_date,
            'source_url': self.tender_list_url,
            'buyer': 'Trans-Caledon Tunnel Authority',
            'document_urls': []
        }

    def _extract_by_pattern(self, element):
        """Extract tenders by searching for reference patterns"""
        tenders = []
        text = element.get_text()

        # Find all tender references
        ref_patterns = re.finditer(r'(Tender\s+No\.?\s+[\d/\w\-]+)', text, re.I)

        for match in ref_patterns:
            start = match.start()
            end = match.end()

            # Get context around the match (200 chars before and after)
            before = text[max(0, start-200):start].strip()
            after = text[end:min(len(text), end+200)].strip()

            # Build tender entry
            reference_number = match.group(1).replace('Tender No. ', '').replace('Tender No ', '').strip()

            # Title is the text before
            title_text = before.split('\n')[-1] if before else reference_number

            # Try to find closing date in after text
            date_match = re.search(r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})', after, re.I)
            closing_date = None
            if date_match:
                try:
                    closing_date = datetime.strptime(date_match.group(1), '%d %B %Y')
                except:
                    pass

            if reference_number and title_text:
                # Extract budget if available
                estimated_budget = self._extract_budget(after)

                tenders.append({
                    'reference_number': reference_number,
                    'title': title_text[:200],
                    'closing_date': closing_date,
                    'source_url': self.tender_list_url,
                    'buyer': 'Trans-Caledon Tunnel Authority',
                    'document_urls': [],
                    'estimated_budget': estimated_budget
                })

        return tenders

    def _extract_date(self, text):
        """Extract closing date from text"""
        # Look for patterns like "12 August 2026"
        date_patterns = [
            r'Closes?\s*(?:on\s+)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
            r'Closing\s+date\s*(?:is\s+)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    return datetime.strptime(match.group(1), '%d %B %Y')
                except:
                    pass

        return None

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

    def normalize_record(self, raw_record):
        """Normalize TCTA record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'document_urls': raw_record.get('document_urls', []),
                'estimated_budget': raw_record.get('estimated_budget')
            }
        except Exception as e:
            logger.error(f"Error normalizing TCTA record: {e}")
            return None


if __name__ == '__main__':
    collector = TCTACollector()
    collector.collect()

    print("\n✅ TCTA collector completed")
    print("Data stored in Supabase rfqs table")
