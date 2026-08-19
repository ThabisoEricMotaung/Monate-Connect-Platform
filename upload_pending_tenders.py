#!/usr/bin/env python3
"""
Upload pending tenders from JSON files to Supabase
"""

import os
import json
import logging
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def upload_pending_tenders():
    """Upload all pending tender JSON files to Supabase"""

    # Initialize Supabase
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase credentials")

    logger.info(f"Connecting to Supabase: {supabase_url}")
    supabase = create_client(supabase_url, supabase_key)

    # Find all pending tender files
    pending_files = [f for f in os.listdir('.') if f.startswith('tenders_pending_') and f.endswith('.json')]

    total_uploaded = 0

    for filename in pending_files:
        logger.info(f"\nProcessing {filename}...")

        try:
            with open(filename, 'r') as f:
                tenders = json.load(f)

            logger.info(f"Found {len(tenders)} tenders in {filename}")

            for tender in tenders:
                try:
                    # Insert to Supabase (dedup already done at app level)
                    response = supabase.table('rfqs').insert(tender).execute()

                    if response.data:
                        logger.info(f"✓ Uploaded: {tender.get('title')[:50]}...")
                        total_uploaded += 1
                    else:
                        logger.warning(f"No response for: {tender.get('title')[:50]}")

                except Exception as e:
                    logger.error(f"Error uploading tender: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error processing {filename}: {e}")
            continue

    logger.info(f"\n{'='*60}")
    logger.info(f"✅ Upload complete!")
    logger.info(f"Total uploaded: {total_uploaded}")
    logger.info(f"{'='*60}\n")


if __name__ == '__main__':
    upload_pending_tenders()
