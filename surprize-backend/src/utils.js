function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address || '',
    bio: user.bio || '',
    role: user.role,
    joined: user.created_at
  };
}

function validPhone(value) {
  return typeof value === 'string' && /^[+0-9 ()-]{7,20}$/.test(value);
}

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { publicUser, validPhone, asyncRoute };
