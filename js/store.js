/* Surprize – data layer for the static frontend.
   Everything is saved in the browser (localStorage) so the site works without a server.
   DEMO ONLY: passwords are stored as plain text here. The PHP version hashes them. */
const S = (() => {
  const KEY = 'surprize_frontend_v1';
  const CHARGE = 50;
  const OCCASIONS = ['Birthday', 'Anniversary', 'Graduation', 'Proposal', "Valentine's Day", 'Other Event'];
  const FLOW = ['Pending', 'Packaging', 'Dispatched', 'Delivered'];

  const GIFTS = [
    [1, 'Tulip Glass Lamp', 'Lamp', 'Warm LED tulip bouquet under a glass dome.', 850, '💡', 'birthday,anniversary,proposal,valentine'],
    [2, 'Cute Bear Night Lamp', 'Lamp', 'Soft silicone bear night lamp, rechargeable.', 500, '🧸', 'birthday,graduation,other'],
    [3, 'Bubble Candle', 'Candle', 'Hand-poured scented bubble candle.', 350, '🕯️', 'birthday,anniversary,valentine,other'],
    [4, 'Heart Photo Frame', 'Photo Frame', 'Heart-shaped LED frame with your photo.', 700, '🖼️', 'birthday,anniversary,valentine,proposal'],
    [5, 'Chocolate Oreo Cake', 'Cake', 'Rich chocolate drip cake, 1 kg.', 900, '🎂', 'birthday,graduation,anniversary,other'],
    [6, 'Pastel Design Cake', 'Cake', 'Pastel buttercream cake, 1 lb.', 600, '🍰', 'birthday,anniversary,valentine'],
    [7, 'Crochet Flower Bouquet', 'Bouquet', 'Handmade crochet flowers that never fade.', 450, '💐', 'birthday,graduation,anniversary,valentine'],
    [8, 'Red Rose Bouquet', 'Bouquet', 'Twelve fresh red roses, wrapped.', 800, '🌹', 'anniversary,proposal,valentine'],
    [9, 'Cute Teddy Pair', 'Teddy', 'Two plush teddies holding hearts.', 750, '🧸', 'birthday,anniversary,valentine,proposal'],
    [10, 'Graduation Teddy', 'Teddy', 'Teddy in a graduation cap and gown.', 550, '🎓', 'graduation'],
    [11, 'Balloon Decoration Set', 'Decoration', 'Balloons, banner and fairy lights.', 1200, '🎈', 'birthday,graduation,anniversary,other'],
    [12, 'Proposal Setup', 'Decoration', 'Rose-petal heart, candles and signboard.', 2500, '💍', 'proposal'],
    [13, 'Chocolate Gift Box', 'Chocolate', 'Assorted chocolates in a ribbon box.', 400, '🍫', 'birthday,valentine,graduation,anniversary,other'],
    [14, 'Personalised Mug', 'Mug', 'Ceramic mug printed with a name or photo.', 300, '☕', 'birthday,graduation,other'],
    [15, 'Greeting Card', 'Card', 'Handwritten message card with envelope.', 100, '💌', 'birthday,anniversary,graduation,proposal,valentine,other'],
  ].map(([id, name, type, desc, price, emoji, occ]) => ({ id, name, type, desc, price, emoji, occ: occ.split(',') }));

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  db = db || { users: [], session: null, drafts: {}, favs: {}, orders: [], notes: [], seq: 1 };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const products = () => db.products || GIFTS;
  const ADMIN_EMAIL = 'admin@surprize.bt';
  const ADMIN_PASSWORD = 'Admin@123';
  const adminActive = () => sessionStorage.getItem('surprize_admin_session') === 'active';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => 'Nu. ' + Math.round(n).toLocaleString('en-US');
  const qs = k => new URLSearchParams(location.search).get(k);
  const occKey = t => /valentine/i.test(t) ? 'valentine' : /other/i.test(t) ? 'other' : t.toLowerCase();
  const fdate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  /* ---- auth ---- */
  const user = () => db.users.find(u => u.email === db.session) || null;
  function register(f) {
    if (!f.name.trim()) return 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return 'Please enter a valid email address.';
    if (!/^[+0-9 ()-]{7,20}$/.test(f.phone)) return 'Please enter a valid phone number.';
    if (f.password.length < 6) return 'Password must be at least 6 characters.';
    if (f.password !== f.password2) return 'Passwords do not match.';
    if (db.users.some(u => u.email.toLowerCase() === f.email.toLowerCase())) return 'That email is already registered.';
    db.users.push({ name: f.name.trim(), email: f.email.trim(), phone: f.phone, password: f.password, address: '', bio: '', joined: new Date().toISOString() });
    db.session = f.email.trim(); save();
    notify('Welcome to Surprize! Plan your first surprise from the Surprises tab.');
    return null;
  }
  function login(email, password) {
    const u = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!u) return false;
    db.session = u.email; save(); return true;
  }
  const logout = () => { db.session = null; save(); };
  function requireLogin() {
    if (!user()) { sessionStorage.setItem('after_login', location.pathname.split('/').pop() + location.search); location.replace('login.html'); return false; }
    return true;
  }
  function updateUser(patch) { Object.assign(user(), patch); save(); }

  /* ---- draft (surprise being planned) ---- */
  const draft = () => (user() && db.drafts[user().email]) || null;
  function saveDraft(d) { const old = draft() || { items: [] }; db.drafts[user().email] = { ...old, ...d }; save(); }
  const clearDraft = () => { delete db.drafts[user().email]; save(); };
  function addItem(id, qty) {
    const d = draft(); if (!d) return false;
    const it = d.items.find(i => i.id === id);
    it ? it.qty = qty : d.items.push({ id, qty }); save(); return true;
  }
  function removeItem(id) { const d = draft(); d.items = d.items.filter(i => i.id !== id); save(); }
  const gift = id => products().find(g => g.id === id);
  const lines = items => items.map(i => ({ ...gift(i.id), qty: i.qty }));
  const subtotal = items => lines(items).reduce((t, l) => t + l.price * l.qty, 0);

  /* ---- favourites ---- */
  const favs = () => (user() && db.favs[user().email]) || [];
  function toggleFav(id) {
    const e = user().email, f = db.favs[e] || (db.favs[e] = []);
    const i = f.indexOf(id); i < 0 ? f.push(id) : f.splice(i, 1); save(); return i < 0;
  }

  /* ---- notifications ---- */
  function notify(msg) { db.notes.unshift({ email: db.session, msg, read: false, at: new Date().toISOString() }); save(); }
  const notes = () => db.notes.filter(n => n.email === db.session);
  const unread = () => notes().filter(n => !n.read).length;
  const readAll = () => { notes().forEach(n => n.read = true); save(); };

  /* ---- orders ---- */
  const orders = () => db.orders.filter(o => o.email === db.session);
  const order = id => orders().find(o => o.id === Number(id));
  function placeOrder(r) {
    const d = draft();
    const sub = subtotal(d.items);
    const o = { id: db.seq++, email: db.session, title: d.title, type: d.type, forWho: d.forWho, date: d.date, time: d.time, budget: d.budget,
      message: d.message, ...r, items: lines(d.items), subtotal: sub, charge: CHARGE, discount: 0, total: sub + CHARGE,
      status: 'Pending', payment: null, created: new Date().toISOString() };
    db.orders.unshift(o); delete db.drafts[db.session]; save(); return o;
  }
  function pay(id, method, ref) {
    const o = order(id);
    o.payment = { method, ref, status: method === 'cod' ? 'Pay on delivery' : 'Awaiting verification' };
    save(); notify(`Your order for "${o.title}" is confirmed. We will keep you updated.`);
  }
  function cancel(id) { const o = order(id); o.status = 'Cancelled'; save(); notify(`Your order for "${o.title}" was cancelled.`); }
  /* demo helper – in the real system the admin does this */
  function advance(id) {
    const o = order(id), i = FLOW.indexOf(o.status);
    if (i >= 0 && i < FLOW.length - 1) { o.status = FLOW[i + 1]; save(); notify(`Your order for "${o.title}" is now ${o.status}.`); }
  }

  /* ---- "AI assistant" (rule based) ---- */
  const MESSAGES = {
    birthday: ['Happy Birthday! May this year bring you everything you wish for. 🎂', 'Another year older, another year more amazing. Enjoy your day!'],
    anniversary: ['Every day with you is a gift. Happy Anniversary! ❤️', "Here's to us – and all the moments still to come."],
    graduation: ['You did it! So proud of you. Congratulations, graduate! 🎓', 'The future is yours. Congratulations on this big milestone!'],
    proposal: ['You make my world brighter. Will you spend forever with me? 💍', "I can't imagine my life without you. Will you marry me?"],
    valentine: ["Be mine this Valentine's Day and every day after. 💕", "You're my favourite person in the whole world."],
    other: ['Thinking of you and celebrating this moment with you! 🎉', 'Wishing you joy today and always.'],
  };
  function suggest(type, budget) {
    const k = occKey(type);
    const match = products().filter(g => g.occ.includes(k)).sort((a, b) => b.price - a.price);
    const bundle = [], used = {}; let spent = 0;
    if (budget > 0) for (const g of match) if (!used[g.type] && spent + g.price <= budget) { bundle.push(g); spent += g.price; used[g.type] = 1; }
    return { bundle, spent, ideas: match.filter(g => !budget || g.price <= budget).slice(0, 6), messages: MESSAGES[k] || MESSAGES.other };
  }

  /* ---- admin tools (front-end demo only; protect these with a server in production) ---- */
  function adminLogin(email, password) {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return false;
    sessionStorage.setItem('surprize_admin_session', 'active'); return true;
  }
  function adminLogout() { sessionStorage.removeItem('surprize_admin_session'); }
  function adminUsers() { return db.users.map(({ password, ...u }) => ({ ...u, orderCount: db.orders.filter(o => o.email === u.email).length })); }
  function adminOrders() { return [...db.orders].sort((a,b) => new Date(b.created) - new Date(a.created)); }
  function adminProducts() { return products().map(p => ({ ...p })); }
  function saveProduct(product) {
    const name = String(product.name || '').trim(), type = String(product.type || '').trim();
    const price = Number(product.price);
    if (!name || !type || !Number.isFinite(price) || price < 0) return 'Enter a product name, category and valid price.';
    if (!db.products) db.products = GIFTS.map(p => ({ ...p }));
    if (product.id) {
      const i = db.products.findIndex(p => p.id === Number(product.id));
      if (i < 0) return 'Product not found.';
      db.products[i] = { ...db.products[i], name, type, desc: String(product.desc || ''), price, emoji: String(product.emoji || '🎁'), occ: Array.isArray(product.occ) ? product.occ : db.products[i].occ };
    } else {
      const id = Math.max(0, ...db.products.map(p => Number(p.id) || 0)) + 1;
      db.products.push({ id, name, type, desc: String(product.desc || ''), price, emoji: String(product.emoji || '🎁'), occ: ['birthday','anniversary','graduation','proposal','valentine','other'] });
    }
    save(); return null;
  }
  function deleteProduct(id) {
    if (!db.products) db.products = GIFTS.map(p => ({ ...p }));
    db.products = db.products.filter(p => p.id !== Number(id)); save();
  }
  function updateOrderStatus(id, status) {
    const allowed = ['Pending','Packaging','Dispatched','Delivered','Cancelled'];
    const o = db.orders.find(x => x.id === Number(id));
    if (!o || !allowed.includes(status)) return false;
    o.status = status;
    db.notes.unshift({ email: o.email, msg: `Your order for "${o.title}" is now ${status}.`, read: false, at: new Date().toISOString() });
    save(); return true;
  }
  function updatePaymentStatus(id, status) {
    const o = db.orders.find(x => x.id === Number(id)); if (!o || !o.payment) return false;
    o.payment.status = status; save(); return true;
  }
  function adminStats() {
    const revenue = db.orders.filter(o => o.payment && /paid|completed/i.test(o.payment.status)).reduce((n,o) => n + Number(o.total || 0), 0);
    return { users: db.users.length, products: products().length, orders: db.orders.length, revenue,
      pending: db.orders.filter(o => o.status === 'Pending').length };
  }

  const api = { OCCASIONS, FLOW, CHARGE, esc, money, qs, fdate, user, register, login, logout, requireLogin, updateUser,
    draft, saveDraft, clearDraft, addItem, removeItem, gift, lines, subtotal, favs, toggleFav,
    notify, notes, unread, readAll, orders, order, placeOrder, pay, cancel, advance, suggest,
    adminLogin, adminLogout, adminActive, adminUsers, adminOrders, adminProducts, saveProduct, deleteProduct, updateOrderStatus, updatePaymentStatus, adminStats };
  Object.defineProperty(api, 'GIFTS', { enumerable: true, get: products });
  return api;
})();
