"""
Inspect Cape Town TenderPortal structure.
"""

import requests
from bs4 import BeautifulSoup
import warnings
warnings.filterwarnings('ignore')

url = 'https://web1.capetown.gov.za/web1/TenderPortal'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

print(f"Fetching: {url}\n")

try:
    response = requests.get(url, headers=headers, timeout=10, verify=False)
    print(f"Status: {response.status_code}\n")

    soup = BeautifulSoup(response.content, 'html.parser')

    # Check for structures
    tables = soup.find_all('table')
    articles = soup.find_all('article')
    divs = soup.find_all('div', class_=lambda x: x and ('content' in str(x).lower() or 'item' in str(x).lower()))

    print(f"Tables: {len(tables)}")
    print(f"Articles: {len(articles)}")
    print(f"Content divs: {len(divs)}\n")

    # Look for tender items
    if tables:
        print("FIRST TABLE (first 1500 chars):")
        print("="*80)
        print(tables[0].prettify()[:1500])
        print("\n" + "="*80)

    # Get main content
    main = soup.find('main')
    body = soup.find('body')
    content = main or body

    if content:
        text = content.get_text()
        print("\nMAIN CONTENT (first 1500 chars):")
        print("="*80)
        print(text[:1500])
    else:
        print("\nNo main or body found")

    # Look for forms (common in portals)
    forms = soup.find_all('form')
    print(f"\n\nForms found: {len(forms)}")

    # Look for tender references
    import re
    text = soup.get_text()

    # Common tender patterns
    tender_refs = re.findall(r'(?:Tender|RFP|RFQ|Bid)\s*(?:No\.?|#)?\s*[\d\-/]+', text, re.I)
    print(f"Tender reference patterns: {len(set(tender_refs))}")
    if tender_refs:
        print(f"Samples: {list(set(tender_refs))[:5]}")

except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
