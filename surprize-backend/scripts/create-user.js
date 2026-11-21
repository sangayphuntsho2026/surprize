require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/db');

const user = {
  name: 'Yeshi',
  email: 'yeshi123@gmail.com',
  phone: '+97517236898',
  password: 'yeshi@1234'
};

(async () => {
  try {
    const hash = await bcrypt.hash(user.password, 12);
    await db.execute(
      `INSERT INTO users (name,email,phone,password_hash,role)
       VALUES (?,?,?,?, 'customer')
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), password_hash=VALUES(password_hash)`,
      [user.name, user.email, user.phone, hash]
    );
    console.log(`Demo user ready: ${user.email}  password: ${user.password}`);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();