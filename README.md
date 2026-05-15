# Fitness Class Booking API

Labs 1 through 5 of the Components of Software Engineering course at KPI.

- Lab 1 — "do as you can" baseline.
- Lab 2 — refactored into 4 layers (presentation, application, domain, infrastructure).
- Lab 3 — split application into Commands and Queries (CQS).
- Lab 4 — notifications as a side-effect subsystem with sync + async event bus.
- Lab 5 — modular monolith: `core` + `analytics` + `notifications` modules with ACL between them and event-driven cross-module communication.

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

`GET http://localhost:3000/health` should return `{"status":"ok"}`.

The seeded admin is `admin@gym.local` / `admin12345`. Regular registration creates client users.

Settings in `.env`: `PORT`, `JWT_SECRET`, `DB_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `COMMUNICATION_MODE=sync|async` (default `async`).

## Modules (lab 5)

```
src/
  modules/
    core/           writes — users, classes, bookings; strongly consistent
    analytics/      read-only consumer; eventually consistent projections
    notifications/  read-only consumer; sends notifications
  shared/
    messaging/      EventBus interface + sync/async implementations
    auth/           JWT auth middleware
  app/              composition root + Express + entry point
```

Modules talk only through:
- their public contract (each module's `index.js`)
- the shared event bus (Core publishes integration events; Analytics + Notifications subscribe)

Each consumer has its own **ACL** (`modules/<consumer>/acl/`) that translates Core's events into the consumer's internal vocabulary. Outside of the ACL, Analytics talks about `actors` and `resources`, not `users` and `classes`.

The boundary choice is justified in `docs/adr/002-bounded-contexts.md`. The full lab 5 + course retrospective lives in `docs/analysis/lab5.md`.

## Tests

```bash
npm test                                # all 130 tests
npm run test:unit:domain                # core domain only — no DB, no Express
npm run test:unit:commands              # core command handlers (in-memory fakes)
npm run test:unit:messaging             # event bus + notification subscriber
npm run test:unit:analytics             # analytics ACL + commands
npm run test:integration:commands       # core write endpoints
npm run test:integration:queries        # core read endpoints
npm run test:integration:communication  # sync vs async response-time tests
npm run test:integration:analytics      # analytics endpoints (eventual consistency)
```

Domain and command unit tests run in tens of milliseconds because they don't touch any infrastructure. Integration tests are slower (Express + SQLite per request). The analytics integration tests show eventual consistency in action — they call `await container.eventBus.drain()` to wait for Core's events to reach Analytics's subscriber.

## Endpoints

### Core

Auth:
- `POST /api/auth/register` — `{email, password, name}` → `{userId, token}` (publishes `UserRegistered`)
- `POST /api/auth/login` — `{email, password}` → `{userId, token}`
- `GET /api/auth/me` — current user ReadModel

Classes:
- `GET /api/classes` — public, lists upcoming classes (with `bookingsCount`)
- `GET /api/classes/:id` — public
- `POST /api/classes` — admin, returns `{id}`
- `PATCH /api/classes/:id` — admin, returns `{id}`
- `DELETE /api/classes/:id` — admin, returns 204

Bookings:
- `POST /api/bookings` — `{classId}`, returns `{id}` (publishes `BookingCreated`)
- `GET /api/bookings/my` — caller's bookings with class info denormalised in
- `DELETE /api/bookings/:id` — cancel own booking, returns 204 (publishes `BookingCancelled`)

### Analytics

- `GET /api/analytics/popular-classes` — list classes ranked by booking count, in Analytics's own vocabulary (`resourceId`, `resourceTitle`, `bookingsTotal`, `cancellationsTotal`, `activeBookings`, `lastBookedAt`)
- `GET /api/analytics/me` — caller's own activity totals (`bookingsTotal`, `cancellationsTotal`, `activeBookings`, `registeredAt`)

Both Analytics endpoints are eventually consistent with Core. After making a booking, you may need to wait a moment for it to show up here.

## Status codes

200/201/204 success · 400 invalid input · 401 missing/bad token · 403 missing role · 404 not-found · 409 conflict (duplicate, full, already started)

## Project layout

```
src/
  shared/
    messaging/                event bus interface + sync/async impls
    auth/                     JWT auth middleware (used by Core + Analytics)
  modules/
    core/
      index.js                public contract — buildCoreModule + integration events
      events/                 BookingCreated, BookingCancelled, UserRegistered
      domain/                 entities, value objects, factories, errors
      application/            commands + queries + ports (PasswordHasher, TokenService)
      infrastructure/         SQLite repos, mappers, security adapters
      presentation/           HTTP controllers
    analytics/
      index.js                public contract — buildAnalyticsModule
      acl/                    Core-event-translator (renames userId→actorId etc.)
      domain/                 BookingMetric, CancellationMetric, RegistrationMetric
      application/            internal record-* commands + list/get queries
      infrastructure/         analytics-only DB tables + read repos
      presentation/           GET /api/analytics/* endpoints
      subscribers/            bridges Core events into internal commands
    notifications/
      index.js                public contract
      acl/                    own translator (Core event → notification payload)
      domain/                 Notifier interface
      infrastructure/         InMemory / Console / Failing notifier implementations
      subscribers/            handles Core events with idempotency by eventId
  app/
    server.js                 entry point
    app.js                    Express app composition
    composition-root.js       wires modules + chooses sync/async bus
    db.js                     shared SQLite connection
    middleware/
      error-handler.js        domain errors → HTTP statuses (name-based dispatch)
tests/
  unit/                       fast pure tests
    domain/                     core domain tests
    commands/                   core command handlers
    notifications/              notifier behaviour
    messaging/                  event bus, subscriber, idempotency
    analytics/                  ACL + record commands
  integration/                  HTTP through real SQLite
    commands/                     core write endpoints
    queries/                      core read endpoints
    communication/                sync vs async response-time + failure tests
    analytics/                    analytics endpoints + eventual consistency
docs/
  use-cases.md
  adr/001-rich-domain-model.md
  adr/002-bounded-contexts.md
  analysis/lab2.md
  analysis/lab3.md
  analysis/lab4.md
  analysis/lab5.md            ← lab 5 + course retrospective (labs 1-5)
```

## Docs

- Use cases UC-1 to UC-10: `docs/use-cases.md`
- ADRs:
  - `docs/adr/001-rich-domain-model.md` — Rich vs Anemic decision (lab 2)
  - `docs/adr/002-bounded-contexts.md` — module boundaries (lab 5)
- Lab analyses:
  - `docs/analysis/lab2.md` — layered architecture
  - `docs/analysis/lab3.md` — CQS
  - `docs/analysis/lab4.md` — sync vs async messaging
  - `docs/analysis/lab5.md` — modular monolith + course retrospective
