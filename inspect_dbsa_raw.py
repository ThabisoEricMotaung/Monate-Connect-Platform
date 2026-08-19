"""
Inspect DBSA page raw structure.
"""

import requests
from bs4 import BeautifulSoup

url = "https://www.dbsa.org/procurement"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

# Find article
article = soup.find('article')

# Print the article structure (first 2000 chars)
print("ARTICLE HTML STRUCTURE:\n" + "="*80)
print(article.prettify()[:3000])

print("\n" + "="*80)
print("SEARCHING FOR TENDER CONTENT:\n")

# Search in entire page for RFP patterns
all_text = soup.get_text()
import re

# Find all RFP/RFQ references with context
rfp_pattern = r'.{0,100}(RFP\s*\d+[\s\-\.]*\d*).{0,100}'
matches = re.findall(rfp_pattern, all_text, re.I)

print(f"Found {len(matches)} RFP/RFQ references with context:\n")
for i, match in enumerate(matches[:5], 1):
    print(f"{i}. ...{match}...\n")

# Check if content is in scripts (JSON data)
scripts = soup.find_all('script')
for script in scripts:
    if script.string and ('RFP' in script.string or 'tender' in script.string.lower()):
        print(f"\n✓ Found tender data in script tag:")
        print(f"  {script.string[:300]}...\n")

print("\n💡 Likely possibilities:")
print("   1. Tender items loaded via JavaScript (API call)")
print("   2. Content is in an iframe")
print("   3. Data is in a hidden div or JSON in page")
print("   4. Tender list is on a different page")
