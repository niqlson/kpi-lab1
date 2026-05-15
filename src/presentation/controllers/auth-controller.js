const express = require('express');
const { userToResponse } = require('../dto/user-dto');
const { buildAuthMiddleware } = require('../middleware/auth-middleware');

function buildAuthRouter({ useCases, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.post('/register', async (req, res, next) => {
    try {
      const { email, password, name } = req.body || {};
      const { user, token } = await useCases.registerUser.execute({ email, password, name });
      res.status(201).json({ user: userToResponse(user), token });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      const { user, token } = await useCases.loginUser.execute({ email, password });
      res.json({ user: userToResponse(user), token });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', authRequired, async (req, res, next) => {
    try {
      const user = await useCases.getCurrentUser.execute({ userId: req.user.id });
      res.json({ user: userToResponse(user) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildAuthRouter };
