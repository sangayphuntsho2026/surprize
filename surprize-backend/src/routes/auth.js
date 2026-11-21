const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { publicUser, validPhone, asyncRoute } = require('../utils');
const router = express.Router();

router.post('/register', asyncRoute(async (req, res) => {
  const { name, email, phone, password, password2 } = req.body;
  if (!name || !email || !phone || !password) return res.status(400).json({ message: 'All required fields must be filled in.' });
  if (password !== password2) return res.status(400).json({ message: 'Passwords do not match.' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must contain at least 6 characters.' });
  if (!validPhone(phone)) return res.status(400).json({ message: 'Please enter a valid phone number.' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await db.execute('SELECT id FROM users WHERE email=?', [normalizedEmail]);
  if (existing.length) return res.status(409).json({ message: 'An account with this email already exists.' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await db.execute(
    'INSERT INTO users (name,email,phone,password_hash) VALUES (?,?,?,?)',
    [String(name).trim(), normalizedEmail, String(phone).trim(), hash]
  );
  const [rows] = await db.execute('SELECT * FROM users WHERE id=?', [result.insertId]);
  req.session.user = publicUser(rows[0]);
  res.status(201).json({ user: req.session.user });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await db.execute('SELECT * FROM users WHERE email=?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ message: 'Could not start your session.' });
    req.session.user = publicUser(rows[0]);
    res.json({ user: req.session.user });
  });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out.' });
    res.clearCookie('surprize.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

router.get('/me', requireLogin, (req, res) => res.json({ user: req.session.user }));

router.put('/profile', requireLogin, asyncRoute(async (req, res) => {
  const { name, phone, address, bio } = req.body;
  if (!name || !validPhone(phone)) return res.status(400).json({ message: 'Name and a valid phone number are required.' });
  await db.execute('UPDATE users SET name=?,phone=?,address=?,bio=? WHERE id=?',
    [String(name).trim(), String(phone).trim(), address || null, bio || null, req.session.user.id]);
  const [rows] = await db.execute('SELECT * FROM users WHERE id=?', [req.session.user.id]);
  req.session.user = publicUser(rows[0]);
  res.json({ user: req.session.user });
}));

router.patch('/password', requireLogin, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id=?', [req.session.user.id]);
  if (!rows.length || !(await bcrypt.compare(String(currentPassword || ''), rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  if (String(newPassword || '').length < 6) return res.status(400).json({ message: 'New password must contain at least 6 characters.' });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, req.session.user.id]);
  res.json({ message: 'Password updated.' });
}));

module.exports = router;
