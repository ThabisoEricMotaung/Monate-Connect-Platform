"""
Assess SANRAL tender portal structure for scraping.
"""

import requests
from bs4 import BeautifulSoup
import re

def assess_sanral():
    """Fetch and analyze SANRAL tender portal"""

    urls_to_try = [
        "https://www.sanral.co.za/tenders",
        "https://www.sanral.co.za/tender",
        "https://www.sanral.co.za/procurement",
        "https://www.sanral.co.za/business/tenders",
        "https://www.sanral.co.za/",
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

            # Check for iframes
            iframes = soup.find_all('iframe')
            print(f"🔲 iFrames found: {len(iframes)}")
            if iframes:
                for i, iframe in enumerate(iframes[:3]):
                    print(f"   - {iframe.get('src', 'no src')}")

            # Check for script tags
            scripts = soup.find_all('script')
            print(f"📜 Script tags: {len(scripts)}")

            # Look for tender-related keywords
            text = soup.get_text().lower()
            keywords = ['tender', 'procurement', 'bid', 'rfq', 'sanral']
            found_keywords = [k for k in keywords if k in text]
            print(f"🔍 Keywords found: {found_keywords}")

            # Check for common tender list patterns
            divs = soup.find_all('div', class_=re.compile(r'tender|procurement|notice', re.I))
            print(f"📄 Tender divs found: {len(divs)}")

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

            # Check for articles/posts
            articles = soup.find_all('article')
            print(f"\n📰 Articles found: {len(articles)}")

            # Success
            return url, response.content

        except Exception as e:
            print(f"Error: {e}")
            continue

    print("\n❌ Could not reach any SANRAL URLs")
    return None, None


if __name__ == '__main__':
    url, content = assess_sanral()

    if content:
        print(f"\n\n✅ Successfully fetched: {url}")
        print(f"   Content length: {len(content)} bytes")
        print("\n📝 Next: Inspect detailed structure")
    else:
        print("\n⚠️  Will need manual inspection or alternative approach")
