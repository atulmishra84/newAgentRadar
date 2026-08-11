CREATE TABLE IF NOT EXISTS approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    agent_id text NOT NULL,
    stage varchar(50) DEFAULT 'pending', -- pending, review, approved, rejected
    submitted_by varchar(255),
    note text,
    submitted_at timestamp DEFAULT now(),
    resolved_at timestamp,
    resolved_by varchar(255)
);

INSERT INTO approvals (tenant_id, agent_id, stage, submitted_by, note, submitted_at) VALUES 
('00000000-0000-0000-0000-000000000001', 'cb4a1bac-2ee9-47af-951b-c2b2f6409b4b', 'pending', 'system', 'Auto-flagged by scanner.', '2026-08-09 10:00:00'),
('00000000-0000-0000-0000-000000000001', '12106a2b-52f7-4781-b480-2efbfb39a0e7', 'pending', 'system', 'Port 8899 scan detected.', '2026-08-09 11:30:00'),
('00000000-0000-0000-0000-000000000001', 'fa35e181-a249-4f6c-ba2c-3532f85a2f63', 'review', 'system', 'Unknown ML endpoint — investigating.', '2026-08-08 14:00:00'),
('00000000-0000-0000-0000-000000000001', 'c2b04306-3e2d-46f1-981d-35027c113fe2', 'pending', 'user@healthcareglobal.com', 'Employee using LangChain for doc search.', '2026-08-08 09:15:00'),
('00000000-0000-0000-0000-000000000001', '68f2b24f-07a9-4c09-aa09-02db42d5e9d5', 'review', 'user@healthcareglobal.com', 'Zapier for workflow automation.', '2026-08-06 16:45:00');

INSERT INTO approvals (tenant_id, agent_id, stage, submitted_by, note, submitted_at, resolved_at, resolved_by) VALUES 
('00000000-0000-0000-0000-000000000001', '5ba50a49-e269-409d-a9bd-fcbabfc87781', 'approved', 'dev@healthcareglobal.com', 'DataSync ETL Bot initial request', '2026-03-14 10:00:00', '2026-03-15 14:00:00', 'Admin'),
('00000000-0000-0000-0000-000000000001', '01f3b8d1-e560-4b8c-8754-ebcf775cd3a9', 'rejected', 'system', 'Rogue Crawler v1 detected', '2026-03-09 10:00:00', '2026-03-10 14:00:00', 'Admin'),
('00000000-0000-0000-0000-000000000001', '677b155a-c4d1-4219-97b4-2573434b1acc', 'approved', 'analyst@healthcareglobal.com', 'Claude Ops Agent initial approval', '2026-01-19 10:00:00', '2026-01-20 14:00:00', 'Admin');
