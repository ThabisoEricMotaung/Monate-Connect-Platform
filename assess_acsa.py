"""
Assess ACSA tender portal structure for scraping.
"""

import requests
from bs4 import BeautifulSoup
import re

def assess_acsa():
    """Fetch and analyze ACSA tender portal"""

    urls_to_try = [
        "https://www.acsa.co.za/tenders",
        "https://www.acsa.co.za/tender",
        "https://www.acsa.co.za/procurement",
        "https://www.acsa.co.za/business/tenders",
        "https://www.acsa.co.za/",
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

            # Check for articles
            articles = soup.find_all('article')
            print(f"📰 Articles found: {len(articles)}")
            if articles:
                print("First article snippet:")
                print(articles[0].prettify()[:500])

            # Check for iframes
            iframes = soup.find_all('iframe')
            print(f"\n🔲 iFrames found: {len(iframes)}")

            # Check for script tags
            scripts = soup.find_all('script')
            print(f"📜 Script tags: {len(scripts)}")

            # Look for tender-related keywords
            text = soup.get_text().lower()
            keywords = ['tender', 'procurement', 'bid', 'rfq', 'acsa']
            found_keywords = [k for k in keywords if k in text]
            print(f"🔍 Keywords found: {found_keywords}")

            # Try to find links containing 'tender'
            tender_links = [a.get('href') for a in soup.find_all('a') if 'tender' in (a.get('href', '') or '').lower()]
            print(f"🔗 Tender-related links: {len(tender_links)}")
            if tender_links:
                for link in tender_links[:5]:
                    print(f"   - {link}")

            # Print page title
            title = soup.find('title')
            if title:
                print(f"\n📰 Page Title: {title.text}")

            # Look for h2, h3 with tender-like content
            headings = soup.find_all(['h2', 'h3', 'h4'])
            tender_headings = [h.get_text().strip() for h in headings if len(h.get_text().strip()) > 5]
            print(f"\nHeadings: {len(tender_headings)}")
            if tender_headings:
                print("First 5 headings:")
                for h in tender_headings[:5]:
                    print(f"  - {h[:80]}")

            # Success
            return url, response.content

        except Exception as e:
            print(f"Error: {e}")
            continue

    print("\n❌ Could not reach any ACSA URLs")
    return None, None


if __name__ == '__main__':
    url, content = assess_acsa()

    if content:
        print(f"\n\n✅ Successfully fetched: {url}")
        print(f"   Content length: {len(content)} bytes")
        print("\n📝 Next: Inspect detailed structure")
    else:
        print("\n⚠️  Will need manual inspection or alternative approach")
