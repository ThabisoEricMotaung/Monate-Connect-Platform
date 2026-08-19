-- Canonical opportunity (single record per tender, regardless of how many sources publish it)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_normalized VARCHAR(255),
  reference_number VARCHAR(100),
  title VARCHAR(1000),
  description TEXT,
  category VARCHAR(100),
  closing_date TIMESTAMP,
  issue_date TIMESTAMP,
  estimated_value DECIMAL,
  province VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Multiple source observations of the same opportunity
CREATE TABLE source_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  source_name VARCHAR(100),
  source_url TEXT,
  source_reference VARCHAR(100),
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50)
);

-- Field provenance (track which source provided which field)
CREATE TABLE field_provenance (
  opportunity_id UUID REFERENCES opportunities(id),
  field_name VARCHAR(100),
  value_source VARCHAR(100),
  PRIMARY KEY (opportunity_id, field_name)
);

-- Document fingerprints
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  document_url TEXT,
  document_hash VARCHAR(64),
  document_type VARCHAR(50),
  source_name VARCHAR(100),
  first_seen TIMESTAMP DEFAULT NOW()
);

-- Buyer aliases
CREATE TABLE buyer_aliases (
  canonical_name VARCHAR(255) PRIMARY KEY,
  aliases TEXT[]
);

-- Metrics tracking (for the scorecard)
CREATE TABLE source_metrics (
  source_name VARCHAR(100) PRIMARY KEY,
  collection_date DATE DEFAULT CURRENT_DATE,
  gross_collected INT,
  matched_to_treasury INT,
  genuinely_incremental INT,
  extra_docs_count INT,
  avg_publication_lag_days DECIMAL,
  parse_success_rate DECIMAL,
  run_success_rate DECIMAL,
  maintenance_hours_estimate DECIMAL
);

-- Create indexes for fast matching
CREATE INDEX idx_opportunities_reference ON opportunities(reference_number);
CREATE INDEX idx_opportunities_buyer ON opportunities(buyer_normalized);
CREATE INDEX idx_opportunities_closing ON opportunities(closing_date);
CREATE INDEX idx_source_obs_source ON source_observations(source_name);
CREATE INDEX idx_source_obs_opportunity ON source_observations(opportunity_id);