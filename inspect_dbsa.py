"""
Inspect DBSA procurement page structure.
"""

import requests
from bs4 import BeautifulSoup
import re

url = "https://www.dbsa.org/procurement"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

print(f"Status: {response.status_code}\n")

# Look for article/tender items
articles = soup.find_all('article')
print(f"Articles: {len(articles)}")

if articles:
    print("\nFirst article structure:")
    print(articles[0].prettify()[:1000])

# Look for divs with tender content
divs = soup.find_all('div', class_=re.compile(r'tender|item|rfp|rfq', re.I))
print(f"\nTender-related divs: {len(divs)}")

# Look for headings
headings = soup.find_all(['h2', 'h3', 'h4'])
print(f"Headings: {len(headings)}")
if headings:
    print("Sample headings:")
    for h in headings[:5]:
        text = h.get_text().strip()
        if len(text) > 0:
            print(f"  - {text[:80]}")

# Look for links with RFP/RFQ pattern
links = soup.find_all('a')
rfp_links = [a for a in links if re.search(r'RFP|RFQ|tender|procurement', a.get('href', ''), re.I)
             or re.search(r'RFP|RFQ|tender', a.get_text(), re.I)]

print(f"\nRFP/RFQ links: {len(rfp_links)}")
if rfp_links:
    print("Sample links:")
    for link in rfp_links[:5]:
        href = link.get('href', '#')
        text = link.get_text().strip()
        print(f"  - {text[:60]}")
        print(f"    {href[:80]}\n")

# Look for patterns (RFP001, etc.)
text = soup.get_text()
rfp_patterns = re.findall(r'RFP[\s-]?\d+[.\s-]?\d*|RFQ[\s-]?\d+[.\s-]?\d*', text)
print(f"RFP/RFQ codes found: {len(rfp_patterns)}")
if rfp_patterns:
    print(f"Sample: {rfp_patterns[:5]}")

# Look for dates
dates = re.findall(r'\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}|\d{4}-\d{2}-\d{2}', text, re.I)
print(f"\nDate patterns: {len(dates)}")
if dates:
    print(f"Sample dates: {dates[:5]}")

print("\n" + "="*60)
print("STRUCTURE ANALYSIS:")
print("="*60)
print("List type: Check above for article vs. div vs. list structure")
print("Title location: Usually in h2/h3 or span within article")
print("Reference: Look for RFP/RFQ codes")
print("Date: Closing date or publication date")
print("Link: Usually an <a> tag with href to tender document/details")
