const express = require('express');
const { buildAuthMiddleware } = require('../../../shared/auth/auth-middleware');
const { ListPopularResourcesQuery } = require('../application/queries/list-popular-resources');
const { GetActorActivityQuery } = require('../application/queries/get-actor-activity');

function buildAnalyticsRouter({ handlers, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.get('/popular-classes', async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const result = await handlers.listPopularResources.handle(new ListPopularResourcesQuery({ limit }));
      res.json(result);
    } catch (err) { next(err); }
  });

  router.get('/me', authRequired, async (req, res, next) => {
    try {
      const result = await handlers.getActorActivity.handle(new GetActorActivityQuery({ actorId: req.user.id }));
      res.json(result);
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { buildAnalyticsRouter };
