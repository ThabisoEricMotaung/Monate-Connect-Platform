import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SupplierProfile {
  id: string;
  business_name: string;
  industry: string;
  provinces: string[];
  bbbee_level: string | null;
  cidb_grade: string | null;
  smart_score: number | null;
  employee_count: string | null;
  csd_number: string | null;
  verification_status: string;
}

interface Tender {
  id: number;
  title: string;
  category: string;
  province: string;
  provinces: string[];
  bbbee_requirement: string | null;
  require_csd: boolean;
  require_tax_clearance: boolean;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  closing_date: string;
  buyer_org: string;
}

interface MatchScore {
  tenderId: number;
  tenderTitle: string;
  buyer: string;
  closingDate: string;
  matchScore: number;
  matchReasons: string[];
  reason: 'perfect_match' | 'qualified' | 'partial_match' | 'no_match';
}

function calculateMatchScore(supplier: SupplierProfile, tender: Tender): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category/Industry match (40 points max)
  if (supplier.industry && tender.category) {
    const supplierIndustries = supplier.industry.toLowerCase().split(',').map((i) => i.trim());
    const tenderCategory = tender.category.toLowerCase();
    if (supplierIndustries.some((ind) => tenderCategory.includes(ind) || ind.includes(tenderCategory))) {
      score += 40;
      reasons.push('Industry match');
    }
  }

  // 2. Geography match (30 points max)
  if (supplier.provinces && tender.provinces && tender.provinces.length > 0) {
    const match = tender.provinces.some((p) => supplier.provinces.includes(p));
    if (match) {
      score += 30;
      reasons.push('Operates in tender province');
    }
  }

  // 3. B-BBEE requirement (20 points max)
  if (tender.bbbee_requirement && supplier.bbbee_level) {
    const bbbeeMatch = (requirement: string, level: string): boolean => {
      const requiredMap: Record<string, number> = { 'Level 1': 1, 'Level 2': 2, 'Level 3': 3, 'Level 4': 4, 'Level 5': 5, 'Level 6': 6, 'Level 7': 7, 'Level 8': 8 };
      const req = requiredMap[requirement] || 8;
      const sup = requiredMap[level] || 0;
      return sup <= req;
    };
    if (bbbeeMatch(tender.bbbee_requirement, supplier.bbbee_level)) {
      score += 20;
      reasons.push(`B-BBEE Level ${supplier.bbbee_level} meets requirement`);
    }
  }

  // 4. Compliance requirements (10 points max)
  if (tender.require_csd && supplier.csd_number) {
    score += 10;
    reasons.push('Has valid CSD');
  }

  // 5. Smart score/credibility (bonus)
  if (supplier.smart_score && supplier.smart_score >= 70) {
    score += 10;
    reasons.push(`High credibility (score: ${supplier.smart_score})`);
  }

  // 6. CIDB grade (bonus for construction)
  if (supplier.cidb_grade && tender.category && tender.category.toLowerCase().includes('construction')) {
    score += 5;
    reasons.push(`CIDB Grade ${supplier.cidb_grade}`);
  }

  // Determine match reason
  let reason: 'perfect_match' | 'qualified' | 'partial_match' | 'no_match' = 'no_match';
  if (score >= 90) reason = 'perfect_match';
  else if (score >= 70) reason = 'qualified';
  else if (score >= 40) reason = 'partial_match';

  return {
    tenderId: tender.id,
    tenderTitle: tender.title,
    buyer: tender.buyer_org || 'Unknown',
    closingDate: tender.closing_date,
    matchScore: score,
    matchReasons: reasons,
    reason,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const minScore = parseInt(searchParams.get('min_score') || '40');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!supplierId) {
      return NextResponse.json({ error: 'supplier_id required' }, { status: 400 });
    }

    // Fetch supplier profile
    const { data: supplierData, error: supplierError } = await supabase
      .from('profiles')
      .select('id, business_name, industry, provinces, bbbee_level, cidb_grade, smart_score, employee_count, csd_number, verification_status')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplierData) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = supplierData as SupplierProfile;

    // Fetch active tenders
    const { data: tenderData, error: tenderError } = await supabase
      .from('rfqs')
      .select('id, title, category, province, provinces, bbbee_requirement, require_csd, require_tax_clearance, estimated_value_min, estimated_value_max, closing_date, buyer_org')
      .eq('is_public', true)
      .eq('status', 'open')
      .gt('closing_date', new Date().toISOString())
      .limit(100);

    if (tenderError || !tenderData) {
      return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
    }

    // Calculate matches
    const tenders = tenderData as Tender[];
    const matches = tenders
      .map((tender) => calculateMatchScore(supplier, tender))
      .filter((match) => match.matchScore >= minScore)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    // Group by match reason
    const grouped = {
      perfect_match: matches.filter((m) => m.reason === 'perfect_match'),
      qualified: matches.filter((m) => m.reason === 'qualified'),
      partial_match: matches.filter((m) => m.reason === 'partial_match'),
    };

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.business_name,
        industry: supplier.industry,
      },
      matches,
      summary: {
        total_matches: matches.length,
        perfect_matches: grouped.perfect_match.length,
        qualified_matches: grouped.qualified.length,
        partial_matches: grouped.partial_match.length,
      },
      grouped,
    });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 });
  }
}
