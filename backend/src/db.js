const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/alcovia';

const pool = new Pool({ connectionString });

async function init() {
  const schema = require('fs').readFileSync(__dirname + '/schema.sql', 'utf8');
  await pool.query(schema);
}

module.exports = { pool, init };
