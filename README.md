# Fitness Class Booking API — KPI Lab 1

A REST API for a small gym: clients browse and book fitness classes, admins manage the schedule.
Built as the "do as you know how" baseline for the *Components of Software Engineering* course.

**Stack:** Node.js, Express, SQLite (better-sqlite3), JWT, node:test + supertest.

## Requirements

- Node.js 20+ (developed on Node 24)
- npm

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` if you want different values. The defaults work out of the box:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | `dev-secret-change-me` | Secret for signing JWT tokens |
| `DB_PATH` | `./data/app.db` | SQLite file path |
| `ADMIN_EMAIL` | `admin@gym.local` | Seeded admin user email |
| `ADMIN_PASSWORD` | `admin12345` | Seeded admin user password |

## Run

```bash
npm start          # production
npm run dev        # auto-restart on file change
```

The server creates the SQLite file (if missing), runs migrations, seeds the admin user, and listens on `PORT`.

Health check: `GET http://localhost:3000/health` → `{"status":"ok"}`.

## Test

```bash
npm test               # all tests
npm run test:unit      # validation unit tests
npm run test:integration  # HTTP integration tests
```

Tests use an in-memory SQLite database — no setup required.

## API overview

All write endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, name}` | 201 → `{user, token}`. 400 invalid, 409 duplicate. |
| POST | `/api/auth/login` | `{email, password}` | 200 → `{user, token}`. 401 invalid creds. |
| GET | `/api/auth/me` | — | 200 → current user. 401 if no/bad token. |

### Classes

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/classes` | public | Lists upcoming classes. |
| GET | `/api/classes/:id` | public | 404 if missing. |
| POST | `/api/classes` | admin | 201 → class. 400 invariant violated. |
| PATCH | `/api/classes/:id` | admin | 200 → class. 400/404/409. |
| DELETE | `/api/classes/:id` | admin | 204. Cascades bookings. |

### Bookings

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/bookings` | any user | Body `{classId}`. 201, 400, 404, 409. |
| GET | `/api/bookings/my` | any user | Lists caller's bookings with class info. |
| DELETE | `/api/bookings/:id` | any user | 204. 404 if not caller's, 409 if started. |

## Status codes used

- `200` OK, `201` Created, `204` No Content
- `400` Bad Request — validation / invariant violation
- `401` Unauthorized — no/bad/expired token
- `403` Forbidden — authenticated but lacks role
- `404` Not Found — resource missing
- `409` Conflict — duplicate booking, class full, class already started, etc.

## Example request flow

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123","name":"Alice"}'

# Log in as the seeded admin and create a class
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gym.local","password":"admin12345"}' | jq -r .token)

curl -X POST http://localhost:3000/api/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Morning Yoga",
    "instructor": "Anna",
    "startsAt": "2099-01-01T09:00:00.000Z",
    "endsAt":   "2099-01-01T10:00:00.000Z",
    "capacity": 15
  }'
```

## Project layout

```
.
├── docs/
│   ├── use-cases.md      # use-case descriptions (UC-1..UC-10)
│   └── reflection.md     # self-reflection answers
├── src/
│   ├── server.js         # entrypoint
│   ├── app.js            # Express app composition
│   ├── db.js             # SQLite open + migrations + seed
│   ├── middleware/
│   │   └── auth.js       # JWT + role guards
│   ├── utils/
│   │   └── validation.js # pure validation helpers
│   └── routes/
│       ├── auth.js
│       ├── classes.js
│       └── bookings.js
└── tests/
    ├── helpers.js
    ├── unit/
    │   └── validation.test.js
    └── integration/
        ├── auth.test.js
        ├── classes.test.js
        └── bookings.test.js
```

## Use cases

See [`docs/use-cases.md`](docs/use-cases.md).

## Self-reflection

See [`docs/reflection.md`](docs/reflection.md).
