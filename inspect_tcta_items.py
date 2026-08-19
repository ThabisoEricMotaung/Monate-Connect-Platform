"""
Inspect TCTA tender items structure.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.tcta.co.za/tenders/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

response = requests.get(url, headers=headers, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

# Find main content
main = soup.find('main')
if not main:
    print("No main found")
    exit(1)

# Look for lists (common for tenders)
lists = main.find_all(['ul', 'ol'], limit=10)
print(f"Lists in main: {len(lists)}\n")

if lists:
    print("FIRST LIST STRUCTURE:\n" + "="*80)
    list_item = lists[0]

    # Get list items
    items = list_item.find_all('li', recursive=False)
    print(f"List items: {len(items)}\n")

    if items:
        # Show first few items
        for i, item in enumerate(items[:3], 1):
            print(f"Item {i}:")
            print(item.prettify()[:500])
            print("\n")

# Look for divs with specific patterns
print("\n" + "="*80)
print("SEARCHING FOR TENDER DIVS:\n")

# Get all divs with common tender patterns
post_divs = main.find_all('div', class_=re.compile(r'post|item|tender|entry', re.I))
print(f"Post/entry divs: {len(post_divs)}\n")

if post_divs:
    print("FIRST POST DIV:\n")
    print(post_divs[0].prettify()[:800])
    print("\n")

# Try to find text content with tender info
print("\n" + "="*80)
print("LOOKING FOR TENDER TEXT PATTERNS:\n")

main_text = main.get_text()

# Find lines that look like tenders (contain dates or references)
lines = main_text.split('\n')
tender_lines = [l.strip() for l in lines
               if l.strip() and len(l.strip()) > 10
               and ('tender' in l.lower() or 'rfp' in l.lower() or 'rfq' in l.lower()
                    or re.search(r'\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', l, re.I))]

print(f"Lines with tender keywords/dates: {len(tender_lines)}\n")
if tender_lines:
    print("Sample tender lines:")
    for line in tender_lines[:5]:
        print(f"  - {line[:80]}")

# Print all text to find structure
print("\n" + "="*80)
print("MAIN CONTENT TEXT (first 2000 chars):\n")
print(main_text[:2000])
