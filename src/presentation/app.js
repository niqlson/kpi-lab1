const express = require('express');
const { buildAuthRouter } = require('./controllers/auth-controller');
const { buildFitnessClassesRouter } = require('./controllers/fitness-classes-controller');
const { buildBookingsRouter } = require('./controllers/bookings-controller');
const {
  jsonBodyErrorHandler,
  domainErrorHandler,
  fallbackErrorHandler,
} = require('./middleware/error-handler');

function createApp({ useCases, tokenService }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', buildAuthRouter({ useCases, tokenService }));
  app.use('/api/classes', buildFitnessClassesRouter({ useCases, tokenService }));
  app.use('/api/bookings', buildBookingsRouter({ useCases, tokenService }));

  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  app.use(jsonBodyErrorHandler);
  app.use(domainErrorHandler);
  app.use(fallbackErrorHandler);

  return app;
}

module.exports = { createApp };
