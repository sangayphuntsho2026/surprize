function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
