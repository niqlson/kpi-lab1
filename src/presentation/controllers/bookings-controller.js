const express = require('express');
const { bookingToResponse } = require('../dto/booking-dto');
const { buildAuthMiddleware } = require('../middleware/auth-middleware');
const { ValidationError } = require('../../domain/errors');

function buildBookingsRouter({ useCases, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.post('/', authRequired, async (req, res, next) => {
    try {
      const { classId } = req.body || {};
      if (typeof classId !== 'string' || classId.length === 0) {
        throw new ValidationError('classId must be a non-empty string');
      }
      const booking = await useCases.bookClass.execute({ userId: req.user.id, classId });
      res.status(201).json(bookingToResponse(booking));
    } catch (err) {
      next(err);
    }
  });

  router.get('/my', authRequired, async (req, res, next) => {
    try {
      const items = await useCases.listMyBookings.execute({ userId: req.user.id });
      res.json({ items: items.map((it) => bookingToResponse(it.booking, it.fitnessClass)) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', authRequired, async (req, res, next) => {
    try {
      await useCases.cancelBooking.execute({ bookingId: req.params.id, userId: req.user.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildBookingsRouter };
