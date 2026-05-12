const express = require('express');
const { validateClassInput } = require('../utils/validation');
const { authRequired, adminRequired } = require('../middleware/auth');

function classToDto(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    instructor: row.instructor,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    createdAt: row.created_at,
  };
}

function classesRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = req.app.get('db');
    const rows = db.prepare(
      "SELECT * FROM classes WHERE starts_at > datetime('now') ORDER BY starts_at ASC"
    ).all();
    res.json({ items: rows.map(classToDto) });
  });

  router.get('/:id', (req, res) => {
    const db = req.app.get('db');
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'class not found' });
    const row = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'class not found' });
    res.json(classToDto(row));
  });

  router.post('/', authRequired, adminRequired, (req, res) => {
    const { title, description = '', instructor, startsAt, endsAt, capacity } = req.body || {};
    const errors = validateClassInput({ title, instructor, startsAt, endsAt, capacity });
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });
    const db = req.app.get('db');
    const result = db.prepare(
      'INSERT INTO classes (title, description, instructor, starts_at, ends_at, capacity) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, description, instructor, startsAt, endsAt, capacity);
    const row = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(classToDto(row));
  });

  router.patch('/:id', authRequired, adminRequired, (req, res) => {
    const db = req.app.get('db');
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'class not found' });

    const merged = {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      instructor: req.body.instructor ?? existing.instructor,
      startsAt: req.body.startsAt ?? existing.starts_at,
      endsAt: req.body.endsAt ?? existing.ends_at,
      capacity: req.body.capacity ?? existing.capacity,
    };
    const errors = validateClassInput(merged);
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });

    const bookingsCount = db.prepare(
      'SELECT COUNT(*) AS c FROM bookings WHERE class_id = ?'
    ).get(id).c;
    if (merged.capacity < bookingsCount) {
      return res.status(409).json({
        error: 'capacity cannot be lower than current bookings count',
        bookingsCount,
      });
    }

    db.prepare(
      'UPDATE classes SET title = ?, description = ?, instructor = ?, starts_at = ?, ends_at = ?, capacity = ? WHERE id = ?'
    ).run(merged.title, merged.description, merged.instructor, merged.startsAt, merged.endsAt, merged.capacity, id);
    const row = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.json(classToDto(row));
  });

  router.delete('/:id', authRequired, adminRequired, (req, res) => {
    const db = req.app.get('db');
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM classes WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'class not found' });
    db.prepare('DELETE FROM classes WHERE id = ?').run(id);
    res.status(204).send();
  });

  return router;
}

module.exports = { classesRouter };
