-- Contextual Performance Records Schema
-- Tracks supplier performance concerns with buyer evidence, supplier response, and admin assessment
-- Aligns with Bergstan judgment: poor performance is relevant but not automatically disqualifying

-- 1. Performance concerns submitted by buyers
CREATE TABLE IF NOT EXISTS supplier_performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_contract_title TEXT,
  source_contract_reference TEXT,
  source_tender_id UUID, -- link to original tender if available
  concern_type TEXT NOT NULL CHECK (concern_type IN (
    'delivery_delay',
    'quality_defect',
    'non_compliance',
    'safety_breach',
    'financial_issue',
    'subcontractor_default',
    'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'major', 'minor')),
  description TEXT NOT NULL,
  documented_evidence_url TEXT,
  evidence_type TEXT CHECK (evidence_type IN ('correspondence', 'invoice', 'inspection_report', 'legal_notice', 'other')),
  date_occurred DATE,
  date_reported TIMESTAMPTZ DEFAULT NOW(),
  buyer_notes TEXT,
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'under_review',
    'resolved',
    'disputed',
    'dismissed',
    'under_appeal'
  )),
  -- Initial buyer context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_performance_records_supplier_id ON supplier_performance_records(supplier_id);
CREATE INDEX idx_performance_records_buyer_id ON supplier_performance_records(buyer_id);
CREATE INDEX idx_performance_records_status ON supplier_performance_records(status);
CREATE INDEX idx_performance_records_concern_type ON supplier_performance_records(concern_type);
CREATE INDEX idx_performance_records_severity ON supplier_performance_records(severity);

-- 2. Supplier responses to performance concerns
CREATE TABLE IF NOT EXISTS performance_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_record_id UUID NOT NULL REFERENCES supplier_performance_records(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  dispute_claim BOOLEAN DEFAULT FALSE, -- TRUE if supplier disputes the concern
  evidence_url TEXT,
  evidence_type TEXT CHECK (evidence_type IN ('correspondence', 'invoice', 'photo', 'certificate', 'other')),
  corrective_actions_taken TEXT,
  corrective_actions_planned TEXT,
  timeline_for_resolution TEXT,
  response_date TIMESTAMPTZ DEFAULT NOW(),
  -- Admin review of response quality
  response_status TEXT DEFAULT 'acknowledged' CHECK (response_status IN (
    'acknowledged',
    'under_review',
    'accepted',
    'rejected',
    'requires_clarification'
  )),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_responses_performance_record_id ON performance_responses(performance_record_id);
CREATE INDEX idx_performance_responses_supplier_id ON performance_responses(supplier_id);
CREATE INDEX idx_performance_responses_response_status ON performance_responses(response_status);

-- 3. Final assessment and resolution
CREATE TABLE IF NOT EXISTS performance_resolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_record_id UUID NOT NULL REFERENCES supplier_performance_records(id) ON DELETE CASCADE UNIQUE,
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  final_assessment TEXT,
  -- Risk determination
  delivery_risk_assessment TEXT DEFAULT 'unknown' CHECK (delivery_risk_assessment IN (
    'low',
    'medium',
    'high',
    'critical',
    'unknown'
  )),
  -- Outcome
  resolution_outcome TEXT CHECK (resolution_outcome IN (
    'accepted_supplier_explanation',
    'issue_resolved_by_supplier',
    'compensation_agreed',
    'contract_terminated',
    'dismissed_as_unfounded',
    'escalated_to_legal',
    'pending'
  )),
  resolution_notes TEXT,
  -- Appeal/Review
  under_appeal BOOLEAN DEFAULT FALSE,
  appeal_reason TEXT,
  appeal_filed_date TIMESTAMPTZ,
  appeal_decision TEXT,
  appeal_resolved_date TIMESTAMPTZ,
  -- Resolved by
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  -- Learning
  systemic_issue_identified BOOLEAN DEFAULT FALSE,
  systemic_issue_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_resolution_supplier_id ON performance_resolution(supplier_id);
CREATE INDEX idx_performance_resolution_under_appeal ON performance_resolution(under_appeal);
CREATE INDEX idx_performance_resolution_delivery_risk ON performance_resolution(delivery_risk_assessment);

-- 4. Audit trail
CREATE TABLE IF NOT EXISTS performance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_record_id UUID NOT NULL REFERENCES supplier_performance_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'status_changed',
    'response_added',
    'resolved',
    'appealed',
    'appeal_resolved',
    'dismissed'
  )),
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT CHECK (actor_type IN ('supplier', 'buyer', 'admin')),
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_audit_record_id ON performance_audit(performance_record_id);
CREATE INDEX idx_performance_audit_action ON performance_audit(action);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON supplier_performance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON performance_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON performance_resolution TO authenticated;
GRANT SELECT, INSERT ON performance_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON supplier_performance_records TO postgres;
GRANT SELECT, INSERT, UPDATE ON performance_responses TO postgres;
GRANT SELECT, INSERT, UPDATE ON performance_resolution TO postgres;
GRANT SELECT, INSERT ON performance_audit TO postgres;
