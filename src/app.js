const express = require('express');
const { authRouter } = require('./routes/auth');
const { classesRouter } = require('./routes/classes');
const { bookingsRouter } = require('./routes/bookings');

function createApp({ db, jwtSecret }) {
  const app = express();
  app.set('db', db);
  app.set('jwtSecret', jwtSecret);
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter());
  app.use('/api/classes', classesRouter());
  app.use('/api/bookings', bookingsRouter());

  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  app.use((err, req, res, _next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
