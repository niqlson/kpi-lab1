const express = require('express');
const {
  jsonBodyErrorHandler,
  domainErrorHandler,
  fallbackErrorHandler,
} = require('./middleware/error-handler');

// Express app composition. Mounts each module's router under its own prefix.
// The app does not know what's inside each router — it just hangs them off URLs.
function createApp({ container }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Core module
  app.use('/api/auth', container.core.routers.auth);
  app.use('/api/classes', container.core.routers.classes);
  app.use('/api/bookings', container.core.routers.bookings);

  // Analytics module
  app.use('/api/analytics', container.analytics.router);

  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  app.use(jsonBodyErrorHandler);
  app.use(domainErrorHandler);
  app.use(fallbackErrorHandler);

  return app;
}

module.exports = { createApp };
