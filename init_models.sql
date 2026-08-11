CREATE TABLE IF NOT EXISTS models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    vendor varchar(255),
    type varchar(255),
    task varchar(255),
    agents jsonb,
    risk varchar(50) DEFAULT 'medium',
    phi boolean DEFAULT false,
    validated boolean DEFAULT false,
    version varchar(50),
    last_audit timestamp
);

INSERT INTO models (tenant_id, name, vendor, type, task, agents, risk, phi, validated, version, last_audit) VALUES 
('00000000-0000-0000-0000-000000000001', 'clinical-bert-v2', 'HuggingFace', 'NLP', 'Clinical NER / Coding', '[13, 15]', 'medium', true, true, '2.1.0', '2025-03-01'),
('00000000-0000-0000-0000-000000000001', 'radiology-vit-large', 'Internal', 'Vision Transformer', 'Radiology Report Generation', '[14]', 'high', true, false, '1.3.2', '2025-01-15'),
('00000000-0000-0000-0000-000000000001', 'drug-interaction-classifier', 'OpenFDA', 'Gradient Boost', 'Drug Interaction Detection', '[16]', 'low', false, true, '4.0.1', '2025-04-01'),
('00000000-0000-0000-0000-000000000001', 'gpt-4o', 'OpenAI', 'LLM', 'General Automation', '[1]', 'critical', false, false, '2024-11', null),
('00000000-0000-0000-0000-000000000001', 'claude-3-7-sonnet', 'Anthropic', 'LLM', 'Ops & Tooling', '[8]', 'low', false, true, '20250219', '2025-03-15'),
('00000000-0000-0000-0000-000000000001', 'genomics-risk-scorer', 'Internal', 'Neural Net', 'Polygenic Risk Scoring', '[18]', 'high', true, false, '0.9.1', null);
