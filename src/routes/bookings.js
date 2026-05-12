const express = require('express');
const { authRequired } = require('../middleware/auth');

function bookingToDto(row) {
  return {
    id: row.id,
    userId: row.user_id,
    classId: row.class_id,
    createdAt: row.created_at,
    class: row.class_title ? {
      id: row.class_id,
      title: row.class_title,
      instructor: row.class_instructor,
      startsAt: row.class_starts_at,
      endsAt: row.class_ends_at,
    } : undefined,
  };
}

function bookingsRouter() {
  const router = express.Router();

  router.post('/', authRequired, (req, res) => {
    const { classId } = req.body || {};
    if (!Number.isInteger(classId)) {
      return res.status(400).json({ error: 'classId must be an integer' });
    }
    const db = req.app.get('db');
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    if (new Date(cls.starts_at) <= new Date()) {
      return res.status(409).json({ error: 'class has already started' });
    }
    const dup = db.prepare(
      'SELECT id FROM bookings WHERE user_id = ? AND class_id = ?'
    ).get(req.user.id, classId);
    if (dup) return res.status(409).json({ error: 'already booked this class' });

    const count = db.prepare(
      'SELECT COUNT(*) AS c FROM bookings WHERE class_id = ?'
    ).get(classId).c;
    if (count >= cls.capacity) return res.status(409).json({ error: 'class is full' });

    const result = db.prepare(
      'INSERT INTO bookings (user_id, class_id) VALUES (?, ?)'
    ).run(req.user.id, classId);
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(bookingToDto(row));
  });

  router.get('/my', authRequired, (req, res) => {
    const db = req.app.get('db');
    const rows = db.prepare(`
      SELECT
        b.*,
        c.title AS class_title,
        c.instructor AS class_instructor,
        c.starts_at AS class_starts_at,
        c.ends_at AS class_ends_at
      FROM bookings b
      JOIN classes c ON c.id = b.class_id
      WHERE b.user_id = ?
      ORDER BY c.starts_at ASC
    `).all(req.user.id);
    res.json({ items: rows.map(bookingToDto) });
  });

  router.delete('/:id', authRequired, (req, res) => {
    const db = req.app.get('db');
    const id = Number(req.params.id);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking || booking.user_id !== req.user.id) {
      return res.status(404).json({ error: 'booking not found' });
    }
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(booking.class_id);
    if (cls && new Date(cls.starts_at) <= new Date()) {
      return res.status(409).json({ error: 'cannot cancel a booking for a class that has started' });
    }
    db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
    res.status(204).send();
  });

  return router;
}

module.exports = { bookingsRouter };
