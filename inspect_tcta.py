"""
Inspect TCTA tender page structure.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.tcta.co.za/tenders/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

print(f"Status: {response.status_code}\n")

# Look for common structures
print("📋 Page structures:\n")

# Articles
articles = soup.find_all('article')
print(f"Articles: {len(articles)}")

# Divs with post/item/tender classes
divs = soup.find_all('div', class_=re.compile(r'post|item|tender|content', re.I))
print(f"Content divs: {len(divs)}")

# Lists
lists = soup.find_all(['ul', 'ol'])
print(f"Lists: {len(lists)}")

# Tables
tables = soup.find_all('table')
print(f"Tables: {len(tables)}")

# Headings
headings = soup.find_all(['h1', 'h2', 'h3', 'h4'])
print(f"Headings: {len(headings)}")

if headings:
    print("\nHeadings:")
    for h in headings[:5]:
        text = h.get_text().strip()
        if text and len(text) > 0:
            print(f"  - {text[:80]}")

# Look for tender-like content patterns
print("\n📄 Tender patterns:\n")

# Find all links
all_links = soup.find_all('a')
print(f"Total links: {len(all_links)}")

# Filter for tender-related links
tender_links = [a for a in all_links
               if 'tender' in (a.get('href', '') or '').lower()
               or 'tender' in a.get_text().lower()
               or 'rfp' in (a.get('href', '') or '').lower()
               or 'rfq' in (a.get('href', '') or '').lower()]

print(f"Tender-related links: {len(tender_links)}")
if tender_links:
    print("\nSample tender links:")
    for link in tender_links[:5]:
        href = link.get('href', '#')
        text = link.get_text().strip()
        print(f"  - {text[:60]}")
        print(f"    {href[:80]}\n")

# Look for reference patterns
text = soup.get_text()

# TCTA reference patterns (might be like TCTA/2026/001 or similar)
tcta_patterns = re.findall(r'TCTA[/\-\s]\d+[/\-\s]\d+|\d+/\d+/\d+', text)
print(f"\nReference patterns found: {len(set(tcta_patterns))}")
if tcta_patterns:
    unique_patterns = list(set(tcta_patterns))[:5]
    print(f"Sample: {unique_patterns}")

# Look for dates
dates = re.findall(r'\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}|\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2}', text, re.I)
print(f"\nDate patterns: {len(dates)}")
if dates:
    print(f"Sample dates: {dates[:5]}")

print("\n" + "="*60)
print("NEXT: Inspect main content div to understand item structure")
print("="*60)

# Find main content area
main = soup.find('main')
if main:
    print("\nMain content area found. First 800 chars:")
    print(main.prettify()[:800])
else:
    # Try article or section
    article = soup.find('article')
    if article:
        print("\nArticle found. First 800 chars:")
        print(article.prettify()[:800])
