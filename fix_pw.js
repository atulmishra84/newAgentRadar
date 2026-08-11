const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
  '$2b$10$Hz94cOCMG9VaJlutVzO7/.jTnUgh441NZZc3U.AkJlX2SOHBmZ9a.',
  'admin@acme.health'
]).then(() => process.exit(0)).catch(console.error);
