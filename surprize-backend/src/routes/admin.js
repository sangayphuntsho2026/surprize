const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { asyncRoute } = require('../utils');
const router = express.Router();
router.use(requireAdmin);

router.get('/stats', asyncRoute(async (req, res) => {
  const [[users]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role='customer'");
  const [[products]] = await db.query('SELECT COUNT(*) AS total FROM gifts WHERE active=1');
  const [[orders]] = await db.query('SELECT COUNT(*) AS total FROM orders');
  const [[pending]] = await db.query("SELECT COUNT(*) AS total FROM orders WHERE status IN ('Pending','Packaging')");
  const [[revenue]] = await db.query("SELECT COALESCE(SUM(o.total),0) AS total FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.status IN ('Paid','Completed')");
  res.json({ users: users.total, products: products.total, orders: orders.total, pending: pending.total, revenue: Number(revenue.total) });
}));

router.get('/users', asyncRoute(async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id,u.name,u.email,u.phone,u.created_at AS joined,COUNT(o.id) AS orderCount
     FROM users u LEFT JOIN orders o ON o.user_id=u.id
     WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.json({ users: rows });
}));

router.get('/orders', asyncRoute(async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.*,u.email,p.method AS payment_method,p.status AS payment_status
     FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN payments p ON p.order_id=o.id
     ORDER BY o.created_at DESC`
  );
  res.json({ orders: rows });
}));

router.patch('/orders/:id/status', asyncRoute(async (req, res) => {
  const allowed = ['Pending','Packaging','Dispatched','Delivered','Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' });
  const [result] = await db.execute('UPDATE orders SET status=? WHERE id=?', [req.body.status, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Order not found.' });
  const [[order]] = await db.execute('SELECT user_id FROM orders WHERE id=?', [req.params.id]);
  await db.execute('INSERT INTO notifications (user_id,message) VALUES (?,?)',
    [order.user_id, `Your order #${req.params.id} status is now ${req.body.status}.`]);
  res.json({ message: 'Order status updated.' });
}));

router.patch('/orders/:id/payment', asyncRoute(async (req, res) => {
  const allowed = ['Awaiting verification','Paid','Completed','Pay on delivery','Failed'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid payment status.' });
  const [result] = await db.execute(
    'UPDATE payments SET status=?,verified_by=? WHERE order_id=?',
    [req.body.status, req.session.user.id, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Payment not found.' });
  const [[order]] = await db.execute('SELECT user_id FROM orders WHERE id=?', [req.params.id]);
  await db.execute('INSERT INTO notifications (user_id,message) VALUES (?,?)',
    [order.user_id, `Payment for order #${req.params.id}: ${req.body.status}.`]);
  res.json({ message: 'Payment status updated.' });
}));

router.get('/gifts', asyncRoute(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gifts ORDER BY id DESC');
  res.json({ gifts: rows });
}));

router.post('/gifts', asyncRoute(async (req, res) => {
  const { name,type,description,price,emoji,image_url } = req.body;
  if (!name || !type || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: 'Name, category and a valid price are required.' });
  const [result] = await db.execute(
    'INSERT INTO gifts (name,type,description,price,emoji,image_url) VALUES (?,?,?,?,?,?)',
    [name,type,description || null,Number(price),emoji || '🎁',image_url || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Gift created.' });
}));

router.put('/gifts/:id', asyncRoute(async (req, res) => {
  const { name,type,description,price,emoji,image_url,active } = req.body;
  await db.execute(
    'UPDATE gifts SET name=?,type=?,description=?,price=?,emoji=?,image_url=?,active=? WHERE id=?',
    [name,type,description || null,Number(price),emoji || '🎁',image_url || null,active === false ? 0 : 1,req.params.id]
  );
  res.json({ message: 'Gift updated.' });
}));

router.delete('/gifts/:id', asyncRoute(async (req, res) => {
  await db.execute('UPDATE gifts SET active=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Gift removed from catalogue.' });
}));

module.exports = router;
