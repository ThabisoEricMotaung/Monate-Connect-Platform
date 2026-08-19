#!/usr/bin/env python3
"""
Tender deduplication analyzer
Identifies duplicate tenders across sources using multiple matching strategies
"""

import json
import os
import logging
from datetime import datetime
from difflib import SequenceMatcher
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeduplicationAnalyzer:
    """Analyze tenders for duplicates across sources"""

    def __init__(self, json_dir='.'):
        self.json_dir = json_dir
        self.tenders = []
        self.duplicates = []
        self.dedup_groups = []

    def load_tenders(self):
        """Load all pending tenders from JSON files"""
        json_files = [f for f in os.listdir(self.json_dir)
                      if f.startswith('tenders_pending_') and f.endswith('.json')]

        for filename in json_files:
            try:
                with open(filename, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self.tenders.extend(data)
                    logger.info(f"Loaded {len(data)} tenders from {filename}")
            except Exception as e:
                logger.error(f"Error loading {filename}: {e}")

        logger.info(f"\nTotal tenders loaded: {len(self.tenders)}\n")
        return len(self.tenders)

    def _exact_reference_match(self, t1, t2):
        """Check if reference numbers match exactly (strongest signal)"""
        if not t1.get('external_reference') or not t2.get('external_reference'):
            return False

        ref1 = t1['external_reference'].strip().upper()
        ref2 = t2['external_reference'].strip().upper()

        return ref1 == ref2 and ref1 != ''

    def _fuzzy_title_match(self, t1, t2, threshold=0.85):
        """Check if titles are similar (fuzzy matching)"""
        title1 = (t1.get('title') or '').lower().strip()
        title2 = (t2.get('title') or '').lower().strip()

        if not title1 or not title2:
            return False

        # Calculate similarity ratio
        ratio = SequenceMatcher(None, title1, title2).ratio()
        return ratio >= threshold

    def _date_buyer_match(self, t1, t2):
        """Check if closing date + buyer match"""
        date1 = t1.get('closing_date')
        date2 = t2.get('closing_date')
        buyer1 = (t1.get('buyer_org') or '').lower().strip()
        buyer2 = (t2.get('buyer_org') or '').lower().strip()

        return (date1 == date2 and buyer1 == buyer2 and
                buyer1 != '' and date1 is not None)

    def find_duplicates(self):
        """Find duplicate tenders across sources"""
        logger.info("Analyzing for duplicates...\n")

        seen = set()
        duplicate_groups = []

        for i, tender1 in enumerate(self.tenders):
            if i in seen:
                continue

            group = [i]
            source1 = tender1.get('source_name')

            for j, tender2 in enumerate(self.tenders[i+1:], start=i+1):
                if j in seen:
                    continue

                source2 = tender2.get('source_name')

                # Skip if same source (handle within-source dupes separately)
                if source1 == source2:
                    continue

                # Check matching strategies (in order of strength)
                is_duplicate = (
                    self._exact_reference_match(tender1, tender2) or
                    (self._fuzzy_title_match(tender1, tender2) and
                     self._date_buyer_match(tender1, tender2))
                )

                if is_duplicate:
                    group.append(j)
                    seen.add(j)

            if len(group) > 1:
                duplicate_groups.append(group)
                seen.add(i)

        self.dedup_groups = duplicate_groups
        return duplicate_groups

    def report_duplicates(self):
        """Generate deduplication report"""
        logger.info(f"\n{'='*70}")
        logger.info(f"DEDUPLICATION REPORT")
        logger.info(f"{'='*70}\n")

        if not self.dedup_groups:
            logger.info("✅ No duplicates found across sources!")
            logger.info(f"\nTotal unique tenders: {len(self.tenders)}\n")
            return

        logger.info(f"Found {len(self.dedup_groups)} duplicate groups:\n")

        for group_idx, group_indices in enumerate(self.dedup_groups, 1):
            logger.info(f"Duplicate Group #{group_idx}:")

            for idx in group_indices:
                tender = self.tenders[idx]
                logger.info(f"  • {tender.get('source_name')}: {tender.get('external_reference')}")
                logger.info(f"    Title: {tender.get('title')[:60]}...")
                logger.info(f"    Closing: {tender.get('closing_date')}")

            logger.info("")

        logger.info(f"{'='*70}")
        logger.info(f"Total tenders: {len(self.tenders)}")
        logger.info(f"Duplicate groups: {len(self.dedup_groups)}")
        logger.info(f"Tender instances in duplicates: {sum(len(g)-1 for g in self.dedup_groups)}")
        logger.info(f"Unique tenders (after dedup): {len(self.tenders) - sum(len(g)-1 for g in self.dedup_groups)}")
        logger.info(f"{'='*70}\n")

    def save_dedup_report(self, filename='deduplication_report.json'):
        """Save deduplication report to JSON"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_tenders': len(self.tenders),
            'duplicate_groups': len(self.dedup_groups),
            'duplicate_instances': sum(len(g)-1 for g in self.dedup_groups),
            'unique_tenders': len(self.tenders) - sum(len(g)-1 for g in self.dedup_groups),
            'duplicates': [
                {
                    'group_id': i,
                    'tenders': [
                        {
                            'source': self.tenders[idx].get('source_name'),
                            'reference': self.tenders[idx].get('external_reference'),
                            'title': self.tenders[idx].get('title')[:100],
                            'closing_date': self.tenders[idx].get('closing_date')
                        }
                        for idx in group
                    ]
                }
                for i, group in enumerate(self.dedup_groups, 1)
            ]
        }

        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"Report saved to {filename}")


def main():
    analyzer = DeduplicationAnalyzer()
    analyzer.load_tenders()
    analyzer.find_duplicates()
    analyzer.report_duplicates()
    analyzer.save_dedup_report()


if __name__ == '__main__':
    main()
