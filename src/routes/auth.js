const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isValidEmail, isValidPassword, isNonEmptyString } = require('../utils/validation');
const { authRequired } = require('../middleware/auth');

function userToDto(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

function signToken(user, secret) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}

function authRouter() {
  const router = express.Router();

  router.post('/register', (req, res) => {
    const { email, password, name } = req.body || {};
    const errors = [];
    if (!isValidEmail(email)) errors.push('email is invalid');
    if (!isValidPassword(password)) errors.push('password must be at least 8 characters');
    if (!isNonEmptyString(name)) errors.push('name must be a non-empty string');
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });

    const db = req.app.get('db');
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hash, name, 'client');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user, req.app.get('jwtSecret'));
    res.status(201).json({ user: userToDto(user), token });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const token = signToken(user, req.app.get('jwtSecret'));
    res.json({ user: userToDto(user), token });
  });

  router.get('/me', authRequired, (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(401).json({ error: 'user no longer exists' });
    res.json({ user: userToDto(user) });
  });

  return router;
}

module.exports = { authRouter };
