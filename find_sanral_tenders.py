"""
Find SANRAL's actual tender listing location.
"""

import requests
from bs4 import BeautifulSoup
import re

def find_sanral_tenders():
    """Search for SANRAL tender portal"""

    print("Fetching SANRAL homepage...")
    response = requests.get("https://www.sanral.co.za/", timeout=10)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Extract all links
    all_links = soup.find_all('a')
    print(f"\nTotal links on homepage: {len(all_links)}\n")

    # Look for procurement/tender-related links
    potential_links = []
    for link in all_links:
        href = link.get('href', '').lower()
        text = link.get_text().strip().lower()

        if any(keyword in href or keyword in text for keyword in ['tender', 'procurement', 'bid', 'business', 'supply']):
            potential_links.append({
                'text': link.get_text().strip(),
                'href': link.get('href', '#')
            })

    print("🔗 Procurement-related links found:")
    if potential_links:
        for i, link in enumerate(potential_links[:10], 1):
            print(f"{i}. {link['text']}")
            print(f"   → {link['href']}\n")
    else:
        print("   None found on homepage")

    # Try alternative SANRAL URLs based on common patterns
    print("\n" + "="*60)
    print("Trying alternative SANRAL tender URLs...")
    print("="*60)

    alt_urls = [
        "https://www.sanral.co.za/business",
        "https://www.sanral.co.za/about-us",
        "https://sanral.co.za/tenders",
        "https://tenders.sanral.co.za",
        "https://procurement.sanral.co.za",
    ]

    for url in alt_urls:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                print(f"\n✅ {url} (Status: {r.status_code})")
                soup = BeautifulSoup(r.content, 'html.parser')
                title = soup.find('title')
                if title:
                    print(f"   Title: {title.text}")
            else:
                print(f"\n❌ {url} (Status: {r.status_code})")
        except Exception as e:
            print(f"\n❌ {url} (Error: {e})")

    print("\n💡 Try checking:")
    print("   1. https://www.sanral.co.za/business")
    print("   2. Google: 'SANRAL tenders site:sanral.co.za'")
    print("   3. Check if SANRAL uses eTenders.gov.za")


if __name__ == '__main__':
    find_sanral_tenders()
