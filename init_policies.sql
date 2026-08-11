INSERT INTO policies (tenant_id, name, description, config, enabled) VALUES 
('00000000-0000-0000-0000-000000000001', 'No PII without GDPR compliance', 'Any agent accessing PII must have GDPR = pass', '{"cond": "pii_no_gdpr", "act": "flag"}', true),
('00000000-0000-0000-0000-000000000001', 'Shadow critical auto-alert', 'Critical-risk shadow agents trigger CISO alert', '{"cond": "shadow_critical", "act": "alert"}', true),
('00000000-0000-0000-0000-000000000001', 'No unknown protocols', 'Agents with unknown protocols must be reviewed', '{"cond": "unknown_proto", "act": "flag"}', true),
('00000000-0000-0000-0000-000000000001', 'Cloud SOC2 requirement', 'All cloud agents must have SOC2 = pass', '{"cond": "cloud_no_soc2", "act": "flag"}', false),
('00000000-0000-0000-0000-000000000001', 'PHI requires HIPAA compliance', 'Any agent with PHI access must have HIPAA = pass', '{"cond": "phi_no_hipaa", "act": "alert"}', true),
('00000000-0000-0000-0000-000000000001', 'FHIR without HIPAA blocked', 'Agents using FHIR protocols must pass HIPAA controls', '{"cond": "fhir_no_hipaa", "act": "flag"}', true);
