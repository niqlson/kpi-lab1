const express = require('express');
const { buildAuthMiddleware, adminRequired } = require('../../../shared/auth/auth-middleware');
const { CreateFitnessClassCommand } = require('../application/commands/create-fitness-class');
const { UpdateFitnessClassCommand } = require('../application/commands/update-fitness-class');
const { DeleteFitnessClassCommand } = require('../application/commands/delete-fitness-class');
const { ListFitnessClassesQuery } = require('../application/queries/list-fitness-classes');
const { GetFitnessClassQuery } = require('../application/queries/get-fitness-class');

function buildFitnessClassesRouter({ handlers, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.get('/', async (req, res, next) => {
    try {
      const result = await handlers.listFitnessClasses.handle(new ListFitnessClassesQuery());
      res.json(result);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const cls = await handlers.getFitnessClass.handle(new GetFitnessClassQuery({
        classId: req.params.id,
      }));
      res.json(cls);
    } catch (err) { next(err); }
  });

  router.post('/', authRequired, adminRequired, async (req, res, next) => {
    try {
      const result = await handlers.createFitnessClass.handle(new CreateFitnessClassCommand({
        title: req.body?.title,
        description: req.body?.description,
        instructor: req.body?.instructor,
        startsAt: req.body?.startsAt,
        endsAt: req.body?.endsAt,
        capacity: req.body?.capacity,
      }));
      res.status(201).json(result);
    } catch (err) { next(err); }
  });

  router.patch('/:id', authRequired, adminRequired, async (req, res, next) => {
    try {
      const result = await handlers.updateFitnessClass.handle(new UpdateFitnessClassCommand({
        classId: req.params.id,
        title: req.body?.title,
        description: req.body?.description,
        instructor: req.body?.instructor,
        startsAt: req.body?.startsAt,
        endsAt: req.body?.endsAt,
        capacity: req.body?.capacity,
      }));
      res.json(result);
    } catch (err) { next(err); }
  });

  router.delete('/:id', authRequired, adminRequired, async (req, res, next) => {
    try {
      await handlers.deleteFitnessClass.handle(new DeleteFitnessClassCommand({
        classId: req.params.id,
      }));
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { buildFitnessClassesRouter };
