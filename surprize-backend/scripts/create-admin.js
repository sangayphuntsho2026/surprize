require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
(async () => {
  try {
    const name = process.env.ADMIN_NAME || 'Surprize Administrator';
    const email = String(process.env.ADMIN_EMAIL || 'admin@surprize.bt').toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      throw new Error('Set ADMIN_PASSWORD (at least 8 characters) in your .env before running this script.');
    }
    const hash = await bcrypt.hash(password, 12);
    await db.execute(
      `INSERT INTO users (name,email,phone,password_hash,role)
       VALUES (?,?,?,?, 'admin')
       ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='admin'`,
      [name,email,'+97500000000',hash]
    );
    console.log(`Admin account ready: ${email}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();