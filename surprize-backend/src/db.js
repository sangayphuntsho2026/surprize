// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   port: Number(process.env.DB_PORT || 3306),
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'surprize_db',
//   ssl: { rejectUnauthorized: false },
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   dateStrings: true
// });

// module.exports = pool;

const mysql = require('mysql2/promise');

// One shared config used by both the query pool and the session store.
// Cloud databases (Aiven, PlanetScale, etc.) require SSL: set DB_SSL=true in .env.
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'surprize_db'
};

if (String(process.env.DB_SSL || '').toLowerCase() === 'true') {
  // Aiven's certificate is signed by its own CA. Either provide the CA text in
  // DB_SSL_CA (recommended) or leave it empty to encrypt without verifying.
  dbConfig.ssl = process.env.DB_SSL_CA
    ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Called once at startup so connection problems show a clear message.
pool.checkConnection = async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
    if (!tables.length) {
      console.error('\n[DB] Connected, but the "users" table does not exist in database "' + dbConfig.database + '".');
      console.error('[DB] Run database/schema.sql against this database (see README step 3).\n');
    } else {
      console.log(`[DB] Connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    }
  } catch (err) {
    console.error('\n[DB] Cannot connect to MySQL: ' + (err.code || '') + ' ' + err.message);
    console.error(`[DB] Tried ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (ssl=${dbConfig.ssl ? 'on' : 'off'})`);
    console.error('[DB] Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and DB_SSL in your .env\n');
  }
};

pool.dbConfig = dbConfig;
module.exports = pool;