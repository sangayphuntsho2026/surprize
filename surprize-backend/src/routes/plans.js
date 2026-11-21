const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { asyncRoute, validPhone } = require('../utils');
const router = express.Router();

router.post('/', requireLogin, asyncRoute(async (req, res) => {
  const x = req.body;
  if (!x.title || !x.occasion || !x.forWho || !x.date || !x.budget ||
      !x.rname || !validPhone(x.rphone) || !x.raddress) {
    return res.status(400).json({ message: 'Please complete all required surprise details.' });
  }
  if (new Date(x.date) < new Date(new Date().toISOString().slice(0,10))) {
    return res.status(400).json({ message: 'The event date cannot be in the past.' });
  }

  const [result] = await db.execute(
    `INSERT INTO plans
     (user_id,title,occasion,for_who,event_date,event_time,budget,recipient_name,recipient_phone,recipient_address,instructions,card_message)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.session.user.id, x.title, x.occasion, x.forWho, x.date, x.time || null,
     Number(x.budget), x.rname, x.rphone, x.raddress, x.instructions || null, x.message || null]
  );
  res.status(201).json({ planId: result.insertId, message: 'Surprise plan saved.' });
}));

router.get('/mine', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM plans WHERE user_id=? ORDER BY updated_at DESC', [req.session.user.id]);
  res.json({ plans: rows });
}));

module.exports = router;
