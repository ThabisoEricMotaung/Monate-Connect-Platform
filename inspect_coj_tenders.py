"""
Inspect City of Johannesburg tender listing page.
"""

import requests
from bs4 import BeautifulSoup
import warnings
warnings.filterwarnings('ignore')

url = 'https://www.joburg.org.za/Procurement/'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

print(f"Fetching: {url}\n")
response = requests.get(url, headers=headers, timeout=10, verify=False)
soup = BeautifulSoup(response.content, 'html.parser')

print(f'Status: {response.status_code}')

title = soup.find('title')
if title:
    print(f'Title: {title.text}\n')

# Look for tables
tables = soup.find_all('table')
print(f'Tables found: {len(tables)}\n')

if tables:
    print('FIRST TABLE STRUCTURE:\n' + '='*80)
    print(tables[0].prettify()[:1500])
    print('\n' + '='*80)

# Look for links
print('\nTENDER/PROCUREMENT LINKS:')
links = soup.find_all('a')
tender_links = [a for a in links if 'tender' in (a.get('href', '') or '').lower()
                or 'bid' in (a.get('href', '') or '').lower()]

print(f'Found {len(tender_links)} tender-related links')
if tender_links:
    for link in tender_links[:10]:
        href = link.get('href', '#')
        text = link.get_text().strip()
        if text:
            print(f"  - {text[:60]}")
            print(f"    {href[:80]}\n")

# Get main content
print('\nMAIN CONTENT (first 2000 chars):')
print('='*80)
text = soup.get_text()
print(text[:2000])
