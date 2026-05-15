const express = require('express');
const { buildAuthMiddleware } = require('../../../shared/auth/auth-middleware');
const { RegisterUserCommand } = require('../application/commands/register-user');
const { LoginUserCommand } = require('../application/commands/login-user');
const { GetCurrentUserQuery } = require('../application/queries/get-current-user');

function buildAuthRouter({ handlers, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.post('/register', async (req, res, next) => {
    try {
      const result = await handlers.registerUser.handle(new RegisterUserCommand({
        email: req.body?.email,
        password: req.body?.password,
        name: req.body?.name,
      }));
      res.status(201).json(result);
    } catch (err) { next(err); }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const result = await handlers.loginUser.handle(new LoginUserCommand({
        email: req.body?.email,
        password: req.body?.password,
      }));
      res.json(result);
    } catch (err) { next(err); }
  });

  router.get('/me', authRequired, async (req, res, next) => {
    try {
      const user = await handlers.getCurrentUser.handle(new GetCurrentUserQuery({
        userId: req.user.id,
      }));
      res.json({ user });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { buildAuthRouter };
