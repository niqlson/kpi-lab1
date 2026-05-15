# Fitness Class Booking API

Lab 1, Lab 2, Lab 3 and Lab 4 of the Components of Software Engineering course at KPI.

- Lab 1 was the "do as you can" baseline.
- Lab 2 refactored into 4 layers (presentation, application, domain, infrastructure).
- Lab 3 split the application layer into Commands and Queries (CQS).
- Lab 4 added a side-effect subsystem (notifications) with both sync and async wiring through an in-process event bus.

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

Settings are in `.env`: `PORT`, `JWT_SECRET`, `DB_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `COMMUNICATION_MODE=sync|async` (default `async`). The defaults just work.

## Communication modes (lab 4)

`COMMUNICATION_MODE` controls whether the in-process event bus delivers synchronously or asynchronously:

- `sync` — `eventBus.publish()` awaits all subscribers. The booking endpoint waits for the welcome / confirmation notification before responding. Same as a direct call from the handler, just routed through the bus.
- `async` — `eventBus.publish()` returns immediately. The booking response is sent first, then subscribers run in the background.

Same handler code in both modes — only the bus implementation changes. Details and trade-offs in `docs/analysis/lab4.md`.

## Tests

```bash
npm test                                # all 116 tests
npm run test:unit:domain                # domain only — no DB, no Express
npm run test:unit:commands              # command handlers against in-memory fakes
npm run test:unit:messaging             # event bus, subscriber, notifier
npm run test:integration:commands       # write-side endpoints through HTTP + SQLite
npm run test:integration:queries        # read-side endpoints through HTTP + SQLite
npm run test:integration:communication  # sync vs async response time, failure isolation
```

Domain and command unit tests run in tens of ms because they don't touch any infrastructure. Integration tests are slower (Express + SQLite per request). The communication tests measure real response-time differences between the two modes.

## Endpoints

Auth:
- `POST /api/auth/register` — `{email, password, name}` → `{userId, token}` (also publishes `UserRegistered`)
- `POST /api/auth/login` — `{email, password}` → `{userId, token}`
- `GET /api/auth/me` — current user ReadModel (needs token)

Classes:
- `GET /api/classes` — public, lists upcoming classes (with `bookingsCount`)
- `GET /api/classes/:id` — public
- `POST /api/classes` — admin, returns `{id}`
- `PATCH /api/classes/:id` — admin, returns `{id}`
- `DELETE /api/classes/:id` — admin, returns 204, cascades bookings

Bookings:
- `POST /api/bookings` — `{classId}`, returns `{id}` (also publishes `BookingCreated`)
- `GET /api/bookings/my` — caller's bookings with class info denormalised in
- `DELETE /api/bookings/:id` — cancel own booking, returns 204 (also publishes `BookingCancelled`)

Status codes: 200/201/204 on success, 400 for invalid input, 401 for missing/bad token, 403 for missing role, 404 for not-found, 409 for conflicts (duplicate, full, already started).

Lab 3 made the API stricter: command endpoints (POST/PATCH) return only `{id}`. To get the full data, do a follow-up GET. Trade-off in `docs/analysis/lab3.md`.

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
  notifications/          (lab 4) auxiliary component
    notifier.js           interface
    in-memory-notifier.js / console-notifier.js / failing-notifier.js
  messaging/              (lab 4) event bus + integration events + subscribers
    event-bus.js          interface
    sync-event-bus.js     publish() awaits subscribers
    async-event-bus.js    publish() returns immediately, subscribers run after
    events/               BookingCreated, BookingCancelled, UserRegistered (immutable, past tense)
    subscribers/notification-subscriber.js  (with idempotency by eventId)
  presentation/
    app.js                Express composition
    server.js             entry point
    composition-root.js   only place that wires all layers + chooses sync/async bus
    controllers/          thin: HTTP → Command/Query → handler
    middleware/           auth + error→status mapping
tests/
  unit/domain/                  pure tests, no infrastructure
  unit/commands/                command handlers with fakes
  unit/notifications/           notifier behaviour
  unit/messaging/               event bus + subscriber, including idempotency
  integration/commands/         write endpoints through real SQLite
  integration/queries/          read endpoints through real SQLite
  integration/communication/    sync vs async response-time and failure tests
docs/
  use-cases.md
  adr/001-rich-domain-model.md
  analysis/lab2.md
  analysis/lab3.md
  analysis/lab4.md
```

The dependency rule from lab 2 still holds: domain imports nothing from other layers. The new `notifications/` and `messaging/` modules are auxiliary infrastructure — command handlers depend only on the `EventBus` interface, not on any specific notifier or subscriber.

## Docs

- Use cases UC-1 to UC-10: `docs/use-cases.md`
- Why I went with Rich Domain Model: `docs/adr/001-rich-domain-model.md`
- Lab 1 → lab 2 (layered architecture): `docs/analysis/lab2.md`
- Lab 2 → lab 3 (CQS): `docs/analysis/lab3.md`
- Lab 3 → lab 4 (sync vs async messaging): `docs/analysis/lab4.md`
