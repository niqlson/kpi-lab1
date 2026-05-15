const express = require('express');
const { buildAuthMiddleware } = require('../../../shared/auth/auth-middleware');
const { ValidationError } = require('../domain/errors');
const { BookClassCommand } = require('../application/commands/book-class');
const { CancelBookingCommand } = require('../application/commands/cancel-booking');
const { ListMyBookingsQuery } = require('../application/queries/list-my-bookings');

function buildBookingsRouter({ handlers, tokenService }) {
  const router = express.Router();
  const authRequired = buildAuthMiddleware(tokenService);

  router.post('/', authRequired, async (req, res, next) => {
    try {
      const classId = req.body?.classId;
      if (typeof classId !== 'string' || classId.length === 0) {
        throw new ValidationError('classId must be a non-empty string');
      }
      const result = await handlers.bookClass.handle(new BookClassCommand({
        userId: req.user.id,
        classId,
      }));
      res.status(201).json(result);
    } catch (err) { next(err); }
  });

  router.get('/my', authRequired, async (req, res, next) => {
    try {
      const result = await handlers.listMyBookings.handle(new ListMyBookingsQuery({
        userId: req.user.id,
      }));
      res.json(result);
    } catch (err) { next(err); }
  });

  router.delete('/:id', authRequired, async (req, res, next) => {
    try {
      await handlers.cancelBooking.handle(new CancelBookingCommand({
        bookingId: req.params.id,
        userId: req.user.id,
      }));
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { buildBookingsRouter };
