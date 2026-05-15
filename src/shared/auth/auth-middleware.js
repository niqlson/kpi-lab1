function buildAuthMiddleware(tokenService) {
  return function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'authentication required' });
    }
    const payload = tokenService.verify(token);
    if (!payload) {
      return res.status(401).json({ error: 'invalid or expired token' });
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  };
}

function adminRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin role required' });
  next();
}

module.exports = { buildAuthMiddleware, adminRequired };
