"""
Ekurhuleni Metropolitan Municipality tender collector.
Scrapes: https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/
"""

from collectors_base_supabase import TenderCollector
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)


class EkurhuleniCollector(TenderCollector):
    """Ekurhuleni Municipal tender collector"""

    def __init__(self):
        super().__init__(
            source_name='Ekurhuleni',
            base_url='https://www.ekurhuleni.gov.za'
        )
        self.tender_list_url = 'https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/'

    def scrape_listings(self):
        """Scrape Ekurhuleni open tenders listing page"""
        tenders = []
        try:
            response = self.session.get(self.tender_list_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find all tender articles
            articles = soup.find_all('article')
            logger.info(f"Found {len(articles)} tender articles")

            for article in articles:
                try:
                    tender = self._extract_tender_from_article(article)
                    if tender:
                        tenders.append(tender)
                except Exception as e:
                    logger.warning(f"Error extracting tender from article: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error scraping Ekurhuleni: {e}")

        return tenders

    def _extract_tender_from_article(self, article):
        """Extract tender data from an article element"""

        # Find h3 (contains reference number)
        h3 = article.find('h3')
        if not h3:
            return None

        reference_number = h3.get_text().strip()
        if not reference_number:
            return None

        # Get all text content from article
        text = article.get_text()

        # Extract dates (DD/MM/YYYY format)
        date_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        dates = re.findall(date_pattern, text)

        closing_date = None
        # Look for closing date (usually appears near "Closing" or "Closes")
        if dates:
            # Last date found is usually the closing date
            last_date = dates[-1]
            try:
                closing_date = datetime(int(last_date[2]), int(last_date[1]), int(last_date[0]))
            except:
                pass

        # Extract title (often in first line after reference, or in h2/h3)
        # Try to find title in the content
        title = None
        for p in article.find_all('p'):
            text_content = p.get_text().strip()
            if text_content and len(text_content) > 10 and len(text_content) < 300:
                title = text_content
                break

        if not title:
            # Fallback: use reference as title
            title = reference_number

        # Extract budget if available
        estimated_budget = self._extract_budget(text)

        return {
            'reference_number': reference_number,
            'title': title[:200],  # Truncate to 200 chars
            'closing_date': closing_date,
            'source_url': self.tender_list_url,
            'buyer': 'Ekurhuleni Metropolitan Municipality',
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

    def normalize_record(self, raw_record):
        """Normalize Ekurhuleni record to standard format"""
        try:
            return {
                'reference_number': raw_record.get('reference_number'),
                'title': raw_record.get('title'),
                'closing_date': raw_record.get('closing_date'),
                'source_url': raw_record.get('source_url'),
                'buyer_normalized': raw_record.get('buyer'),
                'document_urls': [],
                'estimated_budget': raw_record.get('estimated_budget')
            }
        except Exception as e:
            logger.error(f"Error normalizing Ekurhuleni record: {e}")
            return None


if __name__ == '__main__':
    collector = EkurhuleniCollector()
    collector.collect()

    print("\n✅ Ekurhuleni collector completed")
    print("Data stored in Supabase rfqs table")
