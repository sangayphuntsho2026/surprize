const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { asyncRoute } = require('../utils');
const router = express.Router();

router.get('/', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT id,message AS msg,is_read AS `read`,created_at AS at FROM notifications WHERE user_id=? ORDER BY created_at DESC', [req.session.user.id]);
  res.json({ notifications: rows });
}));

router.patch('/read-all', requireLogin, asyncRoute(async (req, res) => {
  await db.execute('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.session.user.id]);
  res.json({ message: 'Notifications marked as read.' });
}));

module.exports = router;
