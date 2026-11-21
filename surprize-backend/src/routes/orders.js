const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { asyncRoute, validPhone } = require('../utils');
const router = express.Router();
const DELIVERY_CHARGE = Number(process.env.DELIVERY_CHARGE || 50);

router.post('/', requireLogin, asyncRoute(async (req, res) => {
  const x = req.body;
  if (!x.title || !x.occasion || !x.date || !x.items?.length ||
      !x.rname || !validPhone(x.rphone) || !x.raddress) {
    return res.status(400).json({ message: 'Order details or selected gifts are missing.' });
  }

  const ids = [...new Set(x.items.map(i => Number(i.giftId)))];
  if (ids.some(id => !Number.isInteger(id) || id <= 0)) return res.status(400).json({ message: 'Invalid gift selection.' });
  const [gifts] = await db.query(
    `SELECT id,name,price,emoji FROM gifts WHERE active=1 AND id IN (${ids.map(() => '?').join(',')})`, ids
  );
  const byId = new Map(gifts.map(g => [Number(g.id), g]));
  let subtotal = 0;
  const items = x.items.map(i => {
    const gift = byId.get(Number(i.giftId));
    const qty = Number(i.quantity || 1);
    if (!gift || !Number.isInteger(qty) || qty < 1 || qty > 20) throw Object.assign(new Error('A selected gift is unavailable or has an invalid quantity.'), { status: 400 });
    subtotal += Number(gift.price) * qty;
    return { gift, qty };
  });
  const total = subtotal + DELIVERY_CHARGE;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO orders (user_id,title,occasion,recipient_name,recipient_phone,recipient_address,instructions,delivery_method,event_date,event_time,subtotal,delivery_charge,total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.session.user.id, x.title, x.occasion, x.rname, x.rphone, x.raddress,
       x.instructions || null, x.method === 'future' ? 'future' : 'home', x.date, x.time || null,
       subtotal, DELIVERY_CHARGE, total]
    );
    for (const item of items) {
      await connection.execute(
        'INSERT INTO order_items (order_id,gift_id,gift_name,unit_price,emoji,quantity) VALUES (?,?,?,?,?,?)',
        [result.insertId, item.gift.id, item.gift.name, item.gift.price, item.gift.emoji, item.qty]
      );
    }
    await connection.execute('INSERT INTO notifications (user_id,message) VALUES (?,?)',
      [req.session.user.id, `Your order #${result.insertId} has been placed.`]);
    await connection.commit();
    res.status(201).json({ orderId: result.insertId, subtotal, deliveryCharge: DELIVERY_CHARGE, total });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.get('/mine', requireLogin, asyncRoute(async (req, res) => {
  const [orders] = await db.execute('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.session.user.id]);
  for (const order of orders) {
    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id=?', [order.id]);
    const [payments] = await db.execute('SELECT method,reference,status,created_at FROM payments WHERE order_id=?', [order.id]);
    order.items = items;
    order.payment = payments[0] || null;
  }
  res.json({ orders });
}));

router.get('/:id', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.session.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'Order not found.' });
  const [items] = await db.execute('SELECT * FROM order_items WHERE order_id=?', [req.params.id]);
  const [payments] = await db.execute('SELECT method,reference,status,created_at FROM payments WHERE order_id=?', [req.params.id]);
  res.json({ order: { ...rows[0], items, payment: payments[0] || null } });
}));

router.patch('/:id/cancel', requireLogin, asyncRoute(async (req, res) => {
  const [result] = await db.execute(
    `UPDATE orders SET status='Cancelled' WHERE id=? AND user_id=? AND status IN ('Pending','Packaging')`,
    [req.params.id, req.session.user.id]
  );
  if (!result.affectedRows) return res.status(400).json({ message: 'This order cannot be cancelled.' });
  await db.execute('INSERT INTO notifications (user_id,message) VALUES (?,?)',
    [req.session.user.id, `Your order #${req.params.id} was cancelled.`]);
  res.json({ message: 'Order cancelled.' });
}));

router.post('/:id/payment', requireLogin, asyncRoute(async (req, res) => {
  const { method, reference } = req.body;
  if (!['bank_transfer','cod'].includes(method)) return res.status(400).json({ message: 'Choose a valid payment method.' });
  if (method === 'bank_transfer' && !String(reference || '').trim()) return res.status(400).json({ message: 'Enter your transfer reference.' });

  const [orders] = await db.execute('SELECT id,status FROM orders WHERE id=? AND user_id=?', [req.params.id, req.session.user.id]);
  if (!orders.length) return res.status(404).json({ message: 'Order not found.' });
  if (orders[0].status === 'Cancelled') return res.status(400).json({ message: 'Cancelled orders cannot be paid.' });

  const paymentStatus = method === 'cod' ? 'Pay on delivery' : 'Awaiting verification';
  await db.execute(
    `INSERT INTO payments (order_id,method,reference,status) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE method=VALUES(method),reference=VALUES(reference),status=VALUES(status)`,
    [req.params.id, method, method === 'bank_transfer' ? String(reference).trim() : null, paymentStatus]
  );
  await db.execute('INSERT INTO notifications (user_id,message) VALUES (?,?)',
    [req.session.user.id, method === 'cod' ? 'Cash on delivery selected.' : 'Your bank transfer reference was submitted for verification.']);
  res.json({ message: 'Payment details recorded.', status: paymentStatus });
}));

module.exports = router;
