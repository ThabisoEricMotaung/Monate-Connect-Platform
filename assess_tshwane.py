"""
Assess City of Tshwane tender portal structure.
"""

import requests
from bs4 import BeautifulSoup
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

urls_to_try = [
    "https://www.tshwane.gov.za/tenders",
    "https://www.tshwane.gov.za/tender",
    "https://www.tshwane.gov.za/procurement",
    "https://www.tshwane.gov.za/business/tenders",
    "https://www.tshwane.gov.za/",
]

print("CITY OF TSHWANE PORTAL ASSESSMENT\n" + "="*60)

for url in urls_to_try:
    try:
        print(f"\nTrying: {url}")
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        print(f"Status: {response.status_code}")

        if response.status_code != 200:
            continue

        soup = BeautifulSoup(response.content, 'html.parser')

        # Check for structures
        articles = soup.find_all('article')
        tables = soup.find_all('table')
        divs_content = soup.find_all('div', class_=re.compile(r'post|item|tender|content', re.I))

        print(f"Articles: {len(articles)}")
        print(f"Tables: {len(tables)}")
        print(f"Content divs: {len(divs_content)}")

        # Check for tender keywords
        text = soup.get_text().lower()
        if 'tender' in text or 'procurement' in text or 'bid' in text:
            print(f"✓ Tender-related keywords found")
        else:
            print(f"✗ No tender keywords")

        # Check for tender links
        tender_links = [a.get('href') for a in soup.find_all('a')
                       if 'tender' in (a.get('href', '') or '').lower()]
        if tender_links:
            print(f"Tender links: {len(tender_links)}")
            for link in tender_links[:3]:
                print(f"  - {link}")

        # Title
        title = soup.find('title')
        if title:
            print(f"Title: {title.text}")

        # If found content, check it
        if articles or tables or tender_links or 'tender' in text:
            print(f"\n✅ Found tender content at: {url}")
            print("Next: Inspect structure\n")
            break

    except Exception as e:
        print(f"Error: {e}")
        continue
