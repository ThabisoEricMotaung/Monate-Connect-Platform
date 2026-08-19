"""
Inspect actual tender content structure on eTenders.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.etenders.gov.za/"

print(f"Fetching: {url}")
response = requests.get(url, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

print(f"Status: {response.status_code}\n")

# Look for text content with "tender" mentions
text = soup.get_text()
tender_mentions = text.count('tender')
print(f"'Tender' mentions in page: {tender_mentions}\n")

# Try to find actual tender listings
print("🔍 Looking for tender list structures...\n")

# Method 1: Find h2/h3 with tender ref patterns
headings = soup.find_all(['h1', 'h2', 'h3', 'h4'])
tender_headings = [h.get_text().strip() for h in headings if re.search(r'\d{4}|[A-Z]{2,4}-\d{4}', h.get_text())]
print(f"Headings with numbers/refs: {len(tender_headings)}")
if tender_headings:
    print("Sample headings:")
    for h in tender_headings[:5]:
        print(f"  - {h[:80]}")

# Method 2: Look for list items
lis = soup.find_all('li')
tender_lis = [li.get_text().strip() for li in lis if 'tender' in li.get_text().lower() or 'bid' in li.get_text().lower()]
print(f"\nList items mentioning 'tender' or 'bid': {len(tender_lis)}")
if tender_lis:
    print("Sample items:")
    for li in tender_lis[:5]:
        print(f"  - {li[:80]}")

# Method 3: Look for content with dates (tender pattern)
dates = re.findall(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', text)
print(f"\nDate patterns found: {len(dates)}")
if dates:
    print(f"Sample dates: {dates[:5]}")

# Method 4: Check page structure
print("\n📄 Page structure:")
print(f"  Main content: {soup.find('main') is not None}")
print(f"  Article tags: {len(soup.find_all('article'))}")
print(f"  Section tags: {len(soup.find_all('section'))}")

# Look for data attributes (often used in JS frameworks)
elements_with_data = soup.find_all(attrs={'data-tender-id': True})
print(f"  Elements with data-tender-id: {len(elements_with_data)}")

# Check for JavaScript data (often tenders are in JS)
scripts = soup.find_all('script')
print(f"\n📜 Script tags: {len(scripts)}")

# Look for JSON in scripts
for script in scripts[:5]:
    if script.string and '{' in script.string:
        # Check if it looks like data
        if 'tender' in script.string.lower() or 'opportunity' in script.string.lower():
            print(f"\n  Found potential data in script:")
            print(f"  {script.string[:200]}...")

print("\n💡 Analysis:")
print("If no tender content found in static HTML, the page likely uses:")
print("  - JavaScript rendering (need Selenium/Playwright)")
print("  - API calls (need to find API endpoint)")
print("  - Dynamic content loading")
