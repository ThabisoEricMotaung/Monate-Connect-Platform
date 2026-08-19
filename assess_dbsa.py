"""
Assess DBSA tender portal structure.
"""

import requests
from bs4 import BeautifulSoup
import re
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

urls_to_try = [
    "https://www.dbsa.org/tenders",
    "https://www.dbsa.org/en/tenders",
    "https://www.dbsa.org/procurement",
    "https://www.dbsa.org/business/tenders",
    "https://www.dbsa.org/",
]

print("DBSA PORTAL ASSESSMENT\n" + "="*60)

for url in urls_to_try:
    try:
        print(f"\nTrying: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")

        if response.status_code != 200:
            continue

        soup = BeautifulSoup(response.content, 'html.parser')

        # Check for articles/listings
        articles = soup.find_all('article')
        print(f"Articles: {len(articles)}")

        # Check for tables
        tables = soup.find_all('table')
        print(f"Tables: {len(tables)}")

        # Check for tender-like content
        text = soup.get_text().lower()
        if 'tender' in text or 'procurement' in text or 'bid' in text:
            print(f"✓ Tender-related keywords found")
        else:
            print(f"✗ No tender keywords")

        # Check for links to tenders
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

        # If we found content, inspect structure
        if articles or tables or tender_links:
            print(f"\n✅ Found tender content at: {url}")
            print("Next: Build collector\n")
            break

    except Exception as e:
        print(f"Error: {e}")
        continue
