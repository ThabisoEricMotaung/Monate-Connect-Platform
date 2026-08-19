"""
Assess Ekurhuleni Municipal portal structure for scraping.
"""

import requests
from bs4 import BeautifulSoup
import json

def assess_ekurhuleni():
    """Fetch and analyze Ekurhuleni tender portal"""

    urls_to_try = [
        "https://www.ekurhuleni.gov.za/tenders",
        "https://www.ekurhuleni.gov.za/tender",
        "https://www.ekurhuleni.gov.za/tender-notices",
        "https://www.ekurhuleni.gov.za/procurement",
        "https://www.ekurhuleni.gov.za/",
    ]

    for url in urls_to_try:
        try:
            print(f"\n{'='*60}")
            print(f"Trying: {url}")
            print(f"{'='*60}")

            response = requests.get(url, timeout=10)
            print(f"Status: {response.status_code}")

            if response.status_code != 200:
                print(f"Failed: {response.status_code}")
                continue

            soup = BeautifulSoup(response.content, 'html.parser')

            # Look for common tender structures
            print("\n📋 Tables found:", len(soup.find_all('table')))

            # Check for iframes (common for dynamic content)
            iframes = soup.find_all('iframe')
            print(f"🔲 iFrames found: {len(iframes)}")
            if iframes:
                for i, iframe in enumerate(iframes[:3]):
                    print(f"   - {iframe.get('src', 'no src')}")

            # Check for script tags (indicate JS-loaded content)
            scripts = soup.find_all('script')
            print(f"📜 Script tags: {len(scripts)}")

            # Look for tender-related keywords
            text = soup.get_text().lower()
            keywords = ['tender', 'procurement', 'bid', 'rfq', 'notice']
            found_keywords = [k for k in keywords if k in text]
            print(f"🔍 Keywords found: {found_keywords}")

            # Check for common tender list patterns
            divs = soup.find_all('div', class_=['tender', 'tenders', 'procurement', 'notices'])
            print(f"📄 Tender divs found: {len(divs)}")

            # Try to find links containing 'tender'
            tender_links = [a.get('href') for a in soup.find_all('a') if 'tender' in (a.get('href', '') or '').lower()]
            print(f"🔗 Tender-related links: {len(tender_links)}")
            if tender_links:
                for link in tender_links[:5]:
                    print(f"   - {link}")

            # Print page title and meta
            title = soup.find('title')
            if title:
                print(f"\n📰 Page Title: {title.text}")

            # Success
            return url, response.content

        except Exception as e:
            print(f"Error: {e}")
            continue

    print("\n❌ Could not reach any Ekurhuleni URLs")
    return None, None


if __name__ == '__main__':
    url, content = assess_ekurhuleni()

    if content:
        print(f"\n\n✅ Successfully fetched: {url}")
        print(f"   Content length: {len(content)} bytes")
        print("\n📝 Next: Use this assessment to build the collector")
    else:
        print("\n⚠️  Will need manual inspection or alternative approach")
