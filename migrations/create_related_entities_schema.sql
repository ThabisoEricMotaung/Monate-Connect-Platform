-- Related-Enterprise Graph Schema
-- Tracks directors, beneficial owners, and linked enterprises with evidence provenance

-- 1. Supplier-related entities (directors, beneficial owners, linked suppliers)
CREATE TABLE IF NOT EXISTS supplier_related_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('director', 'beneficial_owner', 'linked_supplier', 'shareholder', 'other')),
  entity_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- if entity is a supplier
  entity_name TEXT NOT NULL, -- full name or company name
  entity_registration_number TEXT, -- CIPC registration, ID number, etc.
  relationship_description TEXT, -- e.g., "Shareholder (30% stake)", "Director (appointed 2020)"
  evidence_type TEXT CHECK (evidence_type IN ('self_disclosed', 'csd', 'cipc', 'cidb', 'sars', 'dha', 'user_uploaded', 'verified_independent')),
  evidence_url TEXT, -- URL to supporting document in storage
  evidence_uploaded_at TIMESTAMPTZ,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  dispute_status TEXT CHECK (dispute_status IN ('none', 'disputed_by_supplier', 'under_review', 'resolved')),
  dispute_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_related_entities_supplier_id ON supplier_related_entities(supplier_id);
CREATE INDEX idx_supplier_related_entities_entity_type ON supplier_related_entities(entity_type);
CREATE INDEX idx_supplier_related_entities_verified ON supplier_related_entities(verified);

-- 2. Enterprise-to-enterprise links (common ownership, directorship connections)
CREATE TABLE IF NOT EXISTS enterprise_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('common_director', 'common_shareholder', 'common_beneficial_owner', 'parent_subsidiary', 'related_entity', 'joint_venture', 'other')),
  strength TEXT DEFAULT 'medium' CHECK (strength IN ('strong', 'medium', 'weak')), -- e.g., "strong" = same director + shareholder
  evidence_url TEXT,
  evidence_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enterprise_links_source ON enterprise_links(source_supplier_id);
CREATE INDEX idx_enterprise_links_target ON enterprise_links(target_supplier_id);
CREATE INDEX idx_enterprise_links_link_type ON enterprise_links(link_type);
CREATE UNIQUE INDEX idx_enterprise_links_pair ON enterprise_links(source_supplier_id, target_supplier_id, link_type);

-- 3. Audit trail for entity disclosures
CREATE TABLE IF NOT EXISTS supplier_entity_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('disclosed', 'verified', 'disputed', 'resolved', 'corrected')),
  entity_id UUID REFERENCES supplier_related_entities(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT, -- 'supplier', 'admin', 'verifier'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_entity_audit_supplier_id ON supplier_entity_audit(supplier_id);
CREATE INDEX idx_supplier_entity_audit_action ON supplier_entity_audit(action);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON supplier_related_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON enterprise_links TO authenticated;
GRANT SELECT, INSERT ON supplier_entity_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON supplier_related_entities TO postgres;
GRANT SELECT, INSERT, UPDATE ON enterprise_links TO postgres;
GRANT SELECT, INSERT ON supplier_entity_audit TO postgres;
