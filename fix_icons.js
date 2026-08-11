const { Client } = require('pg');

const ICONS = {
  'Shadow AI Containment': '🔒',
  'PHI Breach Response': '🏥',
  'GDPR Compliance Remediation': '📜',
  'Credential Exposure Response': '🔑',
  'EU AI Act Conformity': '⚖️',
  'MCP/A2A Agent Governance': '🔗'
};

async function fixIcons() {
  const client = new Client({
    connectionString: 'postgresql://agentradar:agentradar@postgres:5432/agentradar'
  });
  
  try {
    await client.connect();
    console.log("Connected to DB");
    
    for (const [name, icon] of Object.entries(ICONS)) {
      const res = await client.query('UPDATE playbooks SET icon = $1 WHERE name = $2', [icon, name]);
      console.log(`Updated ${name}: ${res.rowCount} rows`);
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

fixIcons();
