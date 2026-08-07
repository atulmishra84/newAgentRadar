'use strict';

const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv(path.join(__dirname, '../.env'));

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'agentradar',
  user: process.env.POSTGRES_USER || 'agentradar',
  password: process.env.POSTGRES_PASSWORD || 'agentradar',
});

async function main() {
  const sqlDir = path.join(__dirname, '../sql');
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  for (const file of files) {
    const applied = await pool.query(`SELECT 1 FROM schema_migrations WHERE filename=$1`, [file]);
    // Always re-apply schema.sql with IF NOT EXISTS; skip re-run for numbered migrations if applied
    if (file !== 'schema.sql' && applied.rows.length) {
      console.log(`Skip (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    await pool.query(sql);
    await pool.query(
      `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
      [file]
    );
    console.log(`Applied: ${file}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
