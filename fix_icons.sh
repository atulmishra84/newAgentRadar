#!/bin/bash
psql -U agentradar -d agentradar <<EOF
UPDATE playbooks SET icon='🔒' WHERE name='Shadow AI Containment';
UPDATE playbooks SET icon='🏥' WHERE name='PHI Breach Response';
UPDATE playbooks SET icon='📜' WHERE name='GDPR Compliance Remediation';
UPDATE playbooks SET icon='🔑' WHERE name='Credential Exposure Response';
UPDATE playbooks SET icon='⚖️' WHERE name='EU AI Act Conformity';
UPDATE playbooks SET icon='🔗' WHERE name='MCP/A2A Agent Governance';
EOF
