"""
Assess ACSA with better headers and retry logic.
"""

import requests
from bs4 import BeautifulSoup
import time

# Use realistic headers
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.acsa.co.za/',
}

def fetch_with_retry(url, retries=3):
    """Fetch URL with retry logic"""
    for attempt in range(retries):
        try:
            print(f"Attempt {attempt+1}/{retries}: {url}")
            response = requests.get(url, headers=headers, timeout=15)
            print(f"✓ Status: {response.status_code}")
            return response
        except Exception as e:
            print(f"✗ Error: {e}")
            if attempt < retries - 1:
                wait = 2 ** attempt  # Exponential backoff
                print(f"  Waiting {wait}s before retry...")
                time.sleep(wait)
    return None

urls = [
    "https://www.acsa.co.za/",
    "https://www.acsa.co.za/tenders",
    "https://www.acsa.co.za/business",
]

for url in urls:
    print(f"\n{'='*60}")
    response = fetch_with_retry(url)

    if response:
        soup = BeautifulSoup(response.content, 'html.parser')
        title = soup.find('title')
        print(f"Title: {title.text if title else 'No title'}")
        print(f"Content length: {len(response.content)} bytes")
    else:
        print("Failed after retries")

print("\n💡 If ACSA is still blocking, try:")
print("   1. DBSA (Development Bank)")
print("   2. TCTA (Water Authority)")
print("   3. Or use a different approach (API, manual data)")
