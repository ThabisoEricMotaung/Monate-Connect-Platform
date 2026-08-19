"""
Extract tender list from DBSA procurement page.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.dbsa.org/procurement"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

# Get main article
article = soup.find('article')

if not article:
    print("No article found")
    exit(1)

# Look for tender list container
# Try common patterns
containers = [
    article.find('div', class_=re.compile(r'list|content|body', re.I)),
    article.find('main'),
    article.find('section'),
]

content_div = next((c for c in containers if c), article)

# Find all links that look like tenders (RFP/RFQ pattern)
all_links = content_div.find_all('a')
print(f"Total links in content: {len(all_links)}\n")

print("TENDER ITEMS FOUND:\n" + "="*80)

tenders = []

for link in all_links:
    href = link.get('href', '')
    text = link.get_text().strip()

    # Look for RFP/RFQ patterns
    rfp_match = re.search(r'(RFP|RFQ)\s*[\d\s\-\.]+', text, re.I)

    if rfp_match or 'tender' in href.lower() or 'rfp' in href.lower() or 'rfq' in href.lower():
        # Get parent to find more context
        parent = link.find_parent(['div', 'li', 'tr', 'p'])

        # Extract reference
        ref = rfp_match.group(0) if rfp_match else text[:30]

        # Try to find date in parent
        parent_text = parent.get_text() if parent else text
        date_match = re.search(r'\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}|\d{1,2}/\d{1,2}/\d{4}', parent_text, re.I)
        date = date_match.group(0) if date_match else 'Unknown'

        tender_item = {
            'reference': ref,
            'title': text[:100],
            'url': href,
            'closing_date': date,
        }

        tenders.append(tender_item)

        print(f"Reference: {tender_item['reference']}")
        print(f"Title: {tender_item['title']}")
        print(f"Closing: {tender_item['closing_date']}")
        print(f"URL: {tender_item['url'][:70]}...\n")

print("="*80)
print(f"\n✅ Extracted {len(tenders)} tenders from DBSA\n")

# Sample structure for collector
if tenders:
    print("SAMPLE COLLECTOR STRUCTURE:")
    print(f"""
class DBSACollector(TenderCollector):
    def scrape_listings(self):
        # Fetch {url}
        # Find all <a> tags with RFP/RFQ pattern
        # Extract: reference_number, title, closing_date, url
        # Return list of dicts
        pass
    """)
