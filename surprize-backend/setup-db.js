require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

(async () => {
  let sql = fs.readFileSync(path.join(__dirname, 'database/schema.sql'), 'utf8');
  // Aiven already has a database, so skip CREATE DATABASE / USE
  sql = sql.replace(/CREATE DATABASE[^;]*;/i, '').replace(/USE\s+\w+\s*;/i, '');
  const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
  for (const s of statements) {
    try {
      await db.query(s);
      console.log('OK:', s.split('\n')[0].slice(0, 70));
    } catch (e) {
      console.log('FAILED:', s.split('\n')[0].slice(0, 70), '->', e.message);
    }
  }
  const [t] = await db.query('SHOW TABLES');
  console.log('Tables:', t.map(r => Object.values(r)[0]).join(', '));
  process.exit(0);
})().catch(e => { console.error('CONNECTION ERROR:', e.message); process.exit(1); });