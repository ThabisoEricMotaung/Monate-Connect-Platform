#!/usr/bin/env python3
"""
Diagnose Supabase connection and authentication issues
"""

import os
import json
import logging
import base64
from dotenv import load_dotenv
import httpx

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')


def check_url():
    """Verify Supabase URL format"""
    logger.info("\n1️⃣  Checking Supabase URL...")
    if not SUPABASE_URL:
        logger.error("❌ SUPABASE_URL not set in .env")
        return False

    logger.info(f"   URL: {SUPABASE_URL}")

    # Check format
    if not SUPABASE_URL.startswith('https://'):
        logger.error("❌ URL should start with https://")
        return False

    if not SUPABASE_URL.endswith('.supabase.co'):
        logger.error("❌ URL should end with .supabase.co")
        return False

    if SUPABASE_URL.endswith('/'):
        logger.error("❌ URL has trailing slash (should not)")
        return False

    logger.info("✅ URL format looks valid")
    return True


def check_api_key():
    """Verify API key format"""
    logger.info("\n2️⃣  Checking API Key...")
    if not SUPABASE_KEY:
        logger.error("❌ SUPABASE_SERVICE_ROLE_KEY not set in .env")
        return False

    logger.info(f"   Key (first 50 chars): {SUPABASE_KEY[:50]}...")

    # Check JWT format
    if not SUPABASE_KEY.startswith('eyJ'):
        logger.error("❌ Key should be a JWT starting with 'eyJ'")
        return False

    # Try to decode JWT header
    try:
        parts = SUPABASE_KEY.split('.')
        if len(parts) != 3:
            logger.error(f"❌ JWT should have 3 parts, has {len(parts)}")
            return False

        # Decode header
        header_b64 = parts[0]
        # Add padding if needed
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += '=' * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        logger.info(f"   JWT Header: {header}")
        logger.info("✅ Key format looks valid (valid JWT)")
        return True
    except Exception as e:
        logger.error(f"❌ Invalid JWT format: {e}")
        return False


def test_connectivity():
    """Test network connectivity to Supabase"""
    logger.info("\n3️⃣  Testing network connectivity...")

    try:
        with httpx.Client() as client:
            # Test base URL
            response = client.head(SUPABASE_URL, timeout=5)
            logger.info(f"   Status: {response.status_code}")
            logger.info("✅ Network connectivity OK")
            return True
    except Exception as e:
        logger.error(f"❌ Cannot reach Supabase: {e}")
        return False


def test_authentication():
    """Test API key authentication"""
    logger.info("\n4️⃣  Testing authentication...")

    try:
        with httpx.Client() as client:
            # Try to call health endpoint
            headers = {
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'apikey': SUPABASE_KEY
            }

            # Try REST API
            url = f"{SUPABASE_URL}/rest/v1/"
            response = client.get(url, headers=headers, timeout=5)

            logger.info(f"   GET {url}")
            logger.info(f"   Status: {response.status_code}")

            if response.status_code == 401:
                logger.error("❌ Authentication failed (401 Unauthorized)")
                logger.error(f"   Response: {response.text}")
                return False
            elif response.status_code == 200:
                logger.info("✅ Authentication successful")
                return True
            else:
                logger.warning(f"⚠️  Unexpected status: {response.status_code}")
                logger.info(f"   Response: {response.text}")
                return False

    except Exception as e:
        logger.error(f"❌ Authentication test failed: {e}")
        return False


def test_table_access():
    """Test if rfqs table is accessible"""
    logger.info("\n5️⃣  Testing rfqs table access...")

    try:
        with httpx.Client() as client:
            headers = {
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            }

            # Try to read from rfqs table
            url = f"{SUPABASE_URL}/rest/v1/rfqs?limit=1"
            response = client.get(url, headers=headers, timeout=5)

            logger.info(f"   GET {url}")
            logger.info(f"   Status: {response.status_code}")

            if response.status_code == 401:
                logger.error("❌ Table access denied (401 - likely bad API key)")
                return False
            elif response.status_code == 404:
                logger.error("❌ rfqs table not found (404)")
                logger.info("   Check if the table exists in Supabase")
                return False
            elif response.status_code == 200:
                data = response.json()
                logger.info(f"✅ rfqs table accessible ({len(data)} rows)")
                return True
            else:
                logger.warning(f"⚠️  Unexpected status: {response.status_code}")
                logger.info(f"   Response: {response.text[:200]}")
                return False

    except Exception as e:
        logger.error(f"❌ Table access test failed: {e}")
        return False


def main():
    logger.info("\n" + "="*70)
    logger.info("SUPABASE DIAGNOSTIC")
    logger.info("="*70)

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("\n❌ Missing Supabase credentials in .env")
        logger.info("\nAdd to .env:")
        logger.info("  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co")
        logger.info("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here")
        return

    checks = [
        ("URL Format", check_url),
        ("API Key Format", check_api_key),
        ("Network Connectivity", test_connectivity),
        ("Authentication", test_authentication),
        ("Table Access", test_table_access),
    ]

    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            logger.error(f"Error during {name}: {e}")
            results.append((name, False))

    logger.info("\n" + "="*70)
    logger.info("SUMMARY")
    logger.info("="*70)
    for name, result in results:
        status = "✅" if result else "❌"
        logger.info(f"{status} {name}")

    all_pass = all(r for _, r in results)
    if all_pass:
        logger.info("\n🎉 All checks passed! Supabase is ready.")
    else:
        logger.info("\n⚠️  Some checks failed. Review the output above.")

    logger.info("\n" + "="*70 + "\n")


if __name__ == '__main__':
    main()
