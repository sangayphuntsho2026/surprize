require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const MySQLStore = MySQLStoreFactory(session);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'surprize_db',
  ssl: { rejectUnauthorized: false },
  createDatabaseTable: true
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'surprize.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (e) {
    res.status(503).json({ ok: false, database: 'unavailable', error: e.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));

app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

const frontendDir = path.resolve(__dirname, '..', process.env.FRONTEND_DIR || '../frontend');
app.use(express.static(frontendDir));
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server.'
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Surprize server running at http://localhost:${port}`));

