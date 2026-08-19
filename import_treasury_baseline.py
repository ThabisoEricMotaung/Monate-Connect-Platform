"""
Import Treasury baseline from eTenders into opportunities table.
Scrapes last 90 days of tenders, normalizes, and inserts into PostgreSQL.
"""

import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import logging
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def scrape_etenders(days_back=90):
    """Scrape eTenders.gov.za for recent tenders"""
    tenders = []

    # Try multiple possible URLs
    urls_to_try = [
        "https://www.etenders.gov.za/tender_notices",
        "https://www.etenders.gov.za/tenders",
        "https://www.etenders.gov.za/",
        "https://etenders.gov.za/",
    ]

    base_url = None
    response = None

    try:
        # Try each URL until one works
        for url in urls_to_try:
            try:
                logger.info(f"Trying {url}...")
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    base_url = url
                    response = resp
                    logger.info(f"✓ Successfully fetched {url}")
                    break
            except Exception as e:
                logger.warning(f"Failed {url}: {e}")
                continue

        if not response:
            logger.error("Could not fetch eTenders from any URL")
            return tenders

        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find tender rows in table (adjust selector based on actual structure)
        table = soup.find('table')
        if not table:
            logger.warning("No table found on eTenders page")
            return tenders

        rows = table.find_all('tr')[1:]  # Skip header

        for row in rows:
            try:
                cols = row.find_all('td')
                if len(cols) < 5:
                    continue

                # Extract columns: ref, buyer, title, closing date, value
                reference = cols[0].text.strip()
                buyer = cols[1].text.strip()
                title = cols[2].text.strip()
                closing_date_str = cols[3].text.strip()

                # Parse closing date
                try:
                    closing_date = datetime.strptime(closing_date_str, "%Y-%m-%d")
                except:
                    closing_date = None

                # Check if within our date range
                if closing_date and (datetime.now() - closing_date).days <= days_back:
                    tenders.append({
                        'reference_number': reference,
                        'buyer_normalized': buyer,
                        'title': title,
                        'closing_date': closing_date,
                        'source': 'National Treasury eTenders',
                        'source_url': base_url
                    })
            except Exception as e:
                logger.warning(f"Error parsing row: {e}")
                continue

        logger.info(f"Scraped {len(tenders)} tenders from eTenders")

    except Exception as e:
        logger.error(f"Error scraping eTenders: {e}")

    return tenders


def normalize_buyer_name(buyer_str):
    """Normalize buyer name to match aliases in buyer_aliases table"""
    buyer_str = buyer_str.strip().lower()

    # Map common variations to canonical names
    mapping = {
        'johannesburg': 'City of Johannesburg Metropolitan Municipality',
        'coJ': 'City of Johannesburg Metropolitan Municipality',
        'cape town': 'City of Cape Town Metropolitan Municipality',
        'durban': 'eThekwini Metropolitan Municipality',
        'ethekwini': 'eThekwini Metropolitan Municipality',
        'tshwane': 'City of Tshwane Metropolitan Municipality',
        'pretoria': 'City of Tshwane Metropolitan Municipality',
        'ekurhuleni': 'Ekurhuleni Metropolitan Municipality',
        'nelson mandela': 'Nelson Mandela Bay Metropolitan Municipality',
        'port elizabeth': 'Nelson Mandela Bay Metropolitan Municipality',
        'buffalo city': 'Buffalo City Metropolitan Municipality',
        'east london': 'Buffalo City Metropolitan Municipality',
        'mangaung': 'Mangaung Metropolitan Municipality',
        'bloemfontein': 'Mangaung Metropolitan Municipality',
        'sanral': 'South African National Roads Agency',
        'acsa': 'Airports Company South Africa',
        'tcta': 'Trans-Caledon Tunnel Authority',
        'dbsa': 'Development Bank of Southern Africa',
        'city power': 'City Power Johannesburg',
        'joburg water': 'Johannesburg Water',
    }

    for key, canonical in mapping.items():
        if key in buyer_str:
            return canonical

    return buyer_str.title()  # Fallback: title case original


def insert_baseline(tenders, db_params):
    """Insert tenders into opportunities table"""
    if not tenders:
        logger.warning("No tenders to insert")
        return 0

    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    inserted = 0

    try:
        for tender in tenders:
            try:
                cur.execute("""
                    INSERT INTO opportunities
                    (buyer_normalized, reference_number, title, closing_date, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (reference_number) DO NOTHING
                """, (
                    normalize_buyer_name(tender['buyer_normalized']),
                    tender['reference_number'],
                    tender['title'],
                    tender['closing_date'],
                    datetime.now()
                ))
                inserted += 1

            except Exception as e:
                logger.error(f"Error inserting tender {tender['reference_number']}: {e}")

        conn.commit()
        logger.info(f"Inserted {inserted} tenders into opportunities table")

    except Exception as e:
        logger.error(f"Database error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

    return inserted


def main():
    db_params = {
        'host': 'localhost',
        'database': 'aiform_procure',
        'user': 'postgres',
        'password': 'your_password'  # Replace with actual password
    }

    logger.info("Starting Treasury baseline import...")

    # Scrape eTenders
    tenders = scrape_etenders(days_back=90)

    if tenders:
        # Insert into database
        inserted = insert_baseline(tenders, db_params)
        logger.info(f"✅ Import complete: {inserted} records inserted")
    else:
        logger.warning("No tenders scraped. Check eTenders site structure.")


if __name__ == '__main__':
    main()
