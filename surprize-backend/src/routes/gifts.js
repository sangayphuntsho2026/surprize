const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { asyncRoute } = require('../utils');
const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
  const search = `%${String(req.query.q || '').trim()}%`;
  const type = String(req.query.type || '').trim();
  const [rows] = await db.execute(
    `SELECT id,name,type,description AS \`desc\`,price,emoji,image_url
     FROM gifts WHERE active=1 AND (name LIKE ? OR type LIKE ? OR description LIKE ?)
     AND (?='' OR type=?) ORDER BY name`,
    [search, search, search, type, type]
  );
  res.json({ gifts: rows });
}));

router.get('/favorites', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute(
    `SELECT g.id,g.name,g.type,g.description AS \`desc\`,g.price,g.emoji,g.image_url
     FROM favorites f JOIN gifts g ON g.id=f.gift_id WHERE f.user_id=? AND g.active=1`,
    [req.session.user.id]
  );
  res.json({ gifts: rows });
}));

router.post('/favorites/:giftId', requireLogin, asyncRoute(async (req, res) => {
  await db.execute('INSERT IGNORE INTO favorites (user_id,gift_id) VALUES (?,?)',
    [req.session.user.id, Number(req.params.giftId)]);
  res.json({ message: 'Added to favorites.' });
}));

router.delete('/favorites/:giftId', requireLogin, asyncRoute(async (req, res) => {
  await db.execute('DELETE FROM favorites WHERE user_id=? AND gift_id=?',
    [req.session.user.id, Number(req.params.giftId)]);
  res.json({ message: 'Removed from favorites.' });
}));

router.post('/ai-suggestions', asyncRoute(async (req, res) => {
  const { getGiftSuggestions } = require('../ai-gifts');
  const result = await getGiftSuggestions(req.body);
  res.json(result);
}));

module.exports = router;
