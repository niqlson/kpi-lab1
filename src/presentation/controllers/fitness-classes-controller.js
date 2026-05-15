const express = require('express');
const { fitnessClassToResponse } = require('../dto/fitness-class-dto');
const { buildAuthMiddleware, adminRequired } = require('../middleware/auth-middleware');

function buildFitnessClassesRouter({ useCases, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.get('/', async (req, res, next) => {
    try {
      const items = await useCases.listFitnessClasses.execute();
      res.json({ items: items.map(fitnessClassToResponse) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const cls = await useCases.getFitnessClass.execute({ classId: req.params.id });
      res.json(fitnessClassToResponse(cls));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authRequired, adminRequired, async (req, res, next) => {
    try {
      const cls = await useCases.createFitnessClass.execute(req.body || {});
      res.status(201).json(fitnessClassToResponse(cls));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', authRequired, adminRequired, async (req, res, next) => {
    try {
      const cls = await useCases.updateFitnessClass.execute({
        classId: req.params.id,
        ...(req.body || {}),
      });
      res.json(fitnessClassToResponse(cls));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', authRequired, adminRequired, async (req, res, next) => {
    try {
      await useCases.deleteFitnessClass.execute({ classId: req.params.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildFitnessClassesRouter };
