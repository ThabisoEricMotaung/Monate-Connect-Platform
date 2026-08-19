"""
Inspect the actual Ekurhuleni open tenders listing page.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/"

try:
    print(f"Fetching: {url}")
    response = requests.get(url, timeout=10)
    print(f"Status: {response.status_code}\n")

    soup = BeautifulSoup(response.content, 'html.parser')

    # Find all post/tender items (common structure: <article>, <div class="post">, etc)
    print("🔍 Looking for tender items...\n")

    # Try to find article tags (common for listings)
    articles = soup.find_all('article')
    print(f"Articles found: {len(articles)}")

    if articles:
        print("\n📄 First tender item structure:")
        print(articles[0].prettify()[:1000])

    # Try divs with post/tender class
    post_divs = soup.find_all('div', class_=re.compile(r'post|tender|item', re.I))
    print(f"\nPost/tender divs: {len(post_divs)}")

    # Look for h2, h3, h4 tags (often contain titles)
    headings = soup.find_all(['h2', 'h3', 'h4'])
    print(f"\nHeadings found: {len(headings)}")
    if headings:
        print("First 5 headings:")
        for h in headings[:5]:
            text = h.get_text().strip()[:80]
            print(f"  - {text}")

    # Look for date patterns (YYYY-MM-DD or DD-MM-YYYY)
    text = soup.get_text()
    dates = re.findall(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', text)
    print(f"\nDate patterns found: {len(dates)}")
    if dates:
        print(f"Sample dates: {dates[:5]}")

    # Look for R value patterns (tender values)
    values = re.findall(r'R\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?', text)
    print(f"\nTender value patterns: {len(values)}")
    if values:
        print(f"Sample values: {values[:5]}")

    # Try to extract tender reference patterns (alphanumeric codes)
    refs = re.findall(r'[A-Z]{2,4}-\d{4}-\d{4}', text)
    print(f"\nTender reference patterns: {len(refs)}")
    if refs:
        print(f"Sample refs: {refs[:5]}")

    print("\n" + "="*60)
    print("💡 Recommendation: Inspect the page manually to understand structure")
    print("   OR run with headless browser (Selenium/Playwright) if JS-heavy")

except Exception as e:
    print(f"Error: {e}")
