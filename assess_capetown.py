"""
Assess City of Cape Town tender portal.
"""

import requests
from bs4 import BeautifulSoup
import warnings
warnings.filterwarnings('ignore')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

urls_to_try = [
    "https://www.capetown.gov.za/tenders",
    "https://www.capetown.gov.za/tender",
    "https://www.capetown.gov.za/business/tenders",
    "https://www.capetown.gov.za/procurement",
    "https://www.capetown.gov.za/",
]

print("CITY OF CAPE TOWN PORTAL ASSESSMENT\n" + "="*60)

for url in urls_to_try:
    try:
        print(f"\nTrying: {url}")
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        print(f"Status: {response.status_code}")

        if response.status_code != 200:
            continue

        soup = BeautifulSoup(response.content, 'html.parser')

        # Check structures
        articles = soup.find_all('article')
        tables = soup.find_all('table')
        divs = soup.find_all('div', class_=lambda x: x and 'tender' in str(x).lower())

        print(f"Articles: {len(articles)}, Tables: {len(tables)}, Tender divs: {len(divs)}")

        # Check for content
        text = soup.get_text().lower()
        if 'tender' in text or 'procurement' in text:
            print(f"✓ Tender keywords found")

            # Get tender links
            tender_links = [a.get('href') for a in soup.find_all('a')
                           if 'tender' in (a.get('href', '') or '').lower()]
            print(f"Tender links: {len(tender_links)}")

            if tender_links:
                for link in tender_links[:3]:
                    print(f"  - {link}")

            print(f"\n✅ Found at: {url}")
            break
        else:
            print(f"✗ No tender content")

    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
    except requests.exceptions.Timeout as e:
        print(f"Timeout: {e}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")

print("\n" + "="*60)
print("If Cape Town blocked, alternatives:")
print("  1. eThekwini (Durban)")
print("  2. Johannesburg Water")
print("  3. City Power Johannesburg")
print("  4. Use Selenium for JavaScript sites (later)")
