# Fitness Class Booking API

Lab 1, Lab 2 and Lab 3 of the Components of Software Engineering course at KPI.

- Lab 1 was the "do as you can" baseline.
- Lab 2 refactored the same project into 4 layers (presentation, application, domain, infrastructure).
- Lab 3 split the application layer into Commands and Queries (CQS).

## Stack

- Node.js 20+ (developed on Node 24)
- Express
- SQLite via better-sqlite3
- JWT for auth, bcryptjs for password hashing
- Node's built-in `node:test` runner + supertest for tests

## How to run

```bash
npm install
cp .env.example .env
npm start
```

Then `GET http://localhost:3000/health` should return `{"status":"ok"}`.

The seeded admin is `admin@gym.local` / `admin12345`. Regular registration creates client users.

Settings are in `.env`: `PORT`, `JWT_SECRET`, `DB_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. The defaults just work.

## Tests

```bash
npm test                              # all tests (96)
npm run test:unit:domain              # domain only — no DB, no Express
npm run test:unit:commands            # command handlers against in-memory fakes
npm run test:integration:commands     # write-side endpoints through HTTP + SQLite
npm run test:integration:queries      # read-side endpoints through HTTP + SQLite
```

Domain tests finish in about 25 ms because they don't touch any infrastructure. Command unit tests are similarly fast because their repositories are in-memory fakes. Integration tests are slower (each one spins up Express and SQLite). The speed gap is the whole point of the layering.

The lab 3 split between command tests (unit, fakes) and query tests (integration, real DB) reflects what each side is actually verifying — commands enforce rules, queries shape data.

## Endpoints

Auth:
- `POST /api/auth/register` — `{email, password, name}` → `{userId, token}`
- `POST /api/auth/login` — `{email, password}` → `{userId, token}`
- `GET /api/auth/me` — current user ReadModel (needs token)

Classes:
- `GET /api/classes` — public, lists upcoming classes (with `bookingsCount`)
- `GET /api/classes/:id` — public
- `POST /api/classes` — admin, returns `{id}`
- `PATCH /api/classes/:id` — admin, returns `{id}`
- `DELETE /api/classes/:id` — admin, returns 204, cascades bookings

Bookings:
- `POST /api/bookings` — `{classId}`, returns `{id}`
- `GET /api/bookings/my` — caller's bookings with class info denormalised in
- `DELETE /api/bookings/:id` — cancel own booking, returns 204

Status codes: 200/201/204 on success, 400 for invalid input, 401 for missing/bad token, 403 for missing role, 404 for not-found, 409 for conflicts (duplicate, full, already started).

Lab 3 made the API stricter: command endpoints (POST/PATCH) return only `{id}`, never the full resource. To get the full data, do a follow-up GET to the matching query endpoint. Trade-off discussed in `docs/analysis/lab3.md`.

IDs are UUID strings.

## Project layout

```
src/
  domain/                 entities, value objects, factories, errors. No external imports.
  application/
    commands/             write side: Command + Handler per operation
    queries/
      ports/              interfaces for read repositories
      *.js                read side: Query + Handler per operation
    ports/                shared ports: PasswordHasher, TokenService
  infrastructure/
    db/                   SQLite connection + migrations
    repositories/         write-side: returns domain entities
    read-repositories/    read-side: returns Read Models from raw SQL
    mappers/              domain entity ↔ DB row
    security/             bcrypt + JWT adapters
  presentation/
    app.js                Express composition
    server.js             entry point
    composition-root.js   only place that wires all layers
    controllers/          thin: HTTP → Command/Query → handler
    middleware/           auth + error→status mapping
tests/
  unit/domain/                pure tests, no infrastructure
  unit/commands/              command handlers with fakes
  integration/commands/       write endpoints through real SQLite
  integration/queries/        read endpoints through real SQLite
docs/
  use-cases.md
  adr/001-rich-domain-model.md
  analysis/lab2.md
  analysis/lab3.md
```

The dependency rule is `presentation → application → domain ← infrastructure`. Domain doesn't import anything from other layers. Both write and read repository interfaces sit at the application/domain edge; their SQLite implementations sit in infrastructure.

## Docs

- Use cases UC-1 to UC-10: `docs/use-cases.md`
- Why I went with Rich Domain Model: `docs/adr/001-rich-domain-model.md`
- Comparison of lab 1 and lab 2 (layered architecture): `docs/analysis/lab2.md`
- Comparison of lab 2 and lab 3 (CQS): `docs/analysis/lab3.md`
