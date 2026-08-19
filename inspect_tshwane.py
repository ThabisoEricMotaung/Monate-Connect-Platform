"""
Inspect City of Tshwane tender page structure.
"""

import requests
from bs4 import BeautifulSoup
import re
import warnings
warnings.filterwarnings('ignore')

url = "https://www.tshwane.gov.za/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10, verify=False)
soup = BeautifulSoup(response.content, 'html.parser')

print(f"Status: {response.status_code}\n")

# Find all links
all_links = soup.find_all('a')
print(f"Total links: {len(all_links)}\n")

# Look for tender-related links
tender_links = [a for a in all_links
               if 'tender' in (a.get('href', '') or '').lower()
               or 'procurement' in (a.get('href', '') or '').lower()
               or 'tender' in a.get_text().lower()
               or 'bid' in a.get_text().lower()]

print(f"Tender-related links: {len(tender_links)}\n")
if tender_links:
    print("Tender-related links found:")
    for link in tender_links[:10]:
        href = link.get('href', '#')
        text = link.get_text().strip()
        print(f"  - {text[:60]}")
        print(f"    {href[:80]}\n")

# Look for specific tender page URL patterns
print("\n" + "="*80)
print("COMMON TENDER PAGE PATTERNS:\n")

common_paths = [
    '/tenders',
    '/tender',
    '/procurement',
    '/bids',
    '/rfp',
    '/rfq',
    '/business/tenders',
    '/services/tenders',
]

base = "https://www.tshwane.gov.za"

for path in common_paths:
    url_to_try = base + path
    try:
        r = requests.get(url_to_try, headers=headers, timeout=5, verify=False)
        if r.status_code == 200:
            print(f"✅ {url_to_try} (200)")
        elif r.status_code == 404:
            print(f"❌ {url_to_try} (404)")
    except Exception as e:
        print(f"❌ {url_to_try} (Error)")

print("\n" + "="*80)
print("LOOKING FOR TENDER CONTENT IN MAIN PAGE:\n")

# Get main article
article = soup.find('article')
if article:
    text = article.get_text()

    # Look for tender patterns
    tender_refs = re.findall(r'(?:Tender|RFP|RFQ|Bid)\s*(?:No\.?|#)?\s*[\d\-/]+', text, re.I)
    print(f"Tender references found: {len(set(tender_refs))}")
    if tender_refs:
        print(f"Sample: {list(set(tender_refs))[:5]}\n")

    # Look for text mentioning tenders
    if 'tender' in text.lower():
        # Find lines with tender mentions
        lines = text.split('\n')
        tender_lines = [l.strip() for l in lines if 'tender' in l.lower() and len(l.strip()) > 20]
        print(f"Lines mentioning tenders: {len(tender_lines)}")
        if tender_lines:
            print("Sample:")
            for line in tender_lines[:3]:
                print(f"  - {line[:80]}")
