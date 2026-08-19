"""
Assess eTenders.gov.za search/filter capabilities for building a flexible collector.
"""

import requests
from bs4 import BeautifulSoup
import re

def assess_etenders():
    """Test eTenders search functionality"""

    print("="*60)
    print("ETENDERS SEARCH ASSESSMENT")
    print("="*60)

    # Try different search URLs
    search_urls = [
        # Try basic search
        ("Search page", "https://www.etenders.gov.za/search"),
        # Try buyer filter
        ("Buyer=SANRAL", "https://www.etenders.gov.za/?buyer=SANRAL"),
        # Try keyword search
        ("Keyword search", "https://www.etenders.gov.za/?q=tender"),
        # Try home
        ("Home", "https://www.etenders.gov.za/"),
        # Try tender listing
        ("Tender list", "https://www.etenders.gov.za/tender"),
    ]

    for name, url in search_urls:
        try:
            print(f"\n🔍 {name}")
            print(f"   URL: {url}")

            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')

                # Look for forms (search filters)
                forms = soup.find_all('form')
                print(f"   Forms found: {len(forms)}")

                if forms:
                    for i, form in enumerate(forms[:2]):
                        inputs = form.find_all('input')
                        selects = form.find_all('select')
                        print(f"     Form {i+1}: {len(inputs)} inputs, {len(selects)} selects")

                        # Show input names
                        for inp in inputs[:3]:
                            name = inp.get('name', 'unnamed')
                            type_ = inp.get('type', 'text')
                            print(f"       - {name} ({type_})")

                # Look for pagination
                pagination = soup.find('nav', class_=re.compile(r'paginat'))
                if pagination:
                    print(f"   Pagination: Yes")
                else:
                    print(f"   Pagination: Not found")

                # Look for tender items
                items = soup.find_all(['article', 'div'], class_=re.compile(r'tender|item|post'))
                print(f"   Tender items: {len(items)}")

        except Exception as e:
            print(f"   Error: {e}")

    print("\n" + "="*60)
    print("QUERY STRING PATTERNS TO TEST")
    print("="*60)

    test_params = [
        ("Filter by buyer", "?buyer=SANRAL"),
        ("Filter by keyword", "?q=SANRAL"),
        ("Filter by status", "?status=open"),
        ("Pagination", "?page=1"),
        ("Combined", "?buyer=SANRAL&status=open&page=1"),
    ]

    for desc, param in test_params:
        url = f"https://www.etenders.gov.za/{param}"
        try:
            r = requests.get(url, timeout=10)
            print(f"\n{desc}: {param}")
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                soup = BeautifulSoup(r.content, 'html.parser')
                items = soup.find_all(['article', 'div'], class_=re.compile(r'tender|item|post'))
                print(f"   Items: {len(items)}")
        except Exception as e:
            print(f"   Error: {e}")


if __name__ == '__main__':
    assess_etenders()
