# Fitness Class Booking API

Lab 1 + Lab 2 of the Components of Software Engineering course at KPI.

Lab 1 was the "do as you can" baseline. Lab 2 is the same project after I refactored it into 4 layers: presentation, application, domain, infrastructure. The HTTP API didn't change between the labs, but everything inside did.

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
npm test                       # all 87 tests
npm run test:unit:domain       # domain only — no DB, no Express
npm run test:unit:application  # use cases against in-memory repos
npm run test:integration       # full HTTP through real SQLite
```

The domain tests finish in about 25 ms because they don't touch any infrastructure. Integration tests take 80–300 ms each because they spin up Express and SQLite per request. That speed gap is the whole point of the layering.

## Endpoints

Auth:
- `POST /api/auth/register` — `{email, password, name}` → `{user, token}`
- `POST /api/auth/login` — `{email, password}` → `{user, token}`
- `GET /api/auth/me` — current user (needs token)

Classes:
- `GET /api/classes` — public, lists upcoming classes
- `GET /api/classes/:id` — public
- `POST /api/classes` — admin only
- `PATCH /api/classes/:id` — admin only
- `DELETE /api/classes/:id` — admin only, cascades bookings

Bookings:
- `POST /api/bookings` — `{classId}`, books for the caller
- `GET /api/bookings/my` — caller's bookings with class info
- `DELETE /api/bookings/:id` — cancel own booking

Status codes: 200/201/204 on success, 400 for invalid input, 401 for missing/bad token, 403 for missing role, 404 for not-found, 409 for conflicts (duplicate, full, already started).

IDs are UUID strings (changed from lab 1's integers — see the analysis doc for why).

## Project layout

```
src/
  domain/          entities, value objects, factories, errors. No external imports.
  application/     use cases + ports (PasswordHasher, TokenService)
  infrastructure/  SQLite repos, JWT/bcrypt adapters, mappers
  presentation/    Express, controllers, DTOs, error→status mapping
tests/
  unit/domain/         pure tests
  unit/application/    use cases with fake repos
  integration/         HTTP through real SQLite
docs/
  use-cases.md
  adr/001-rich-domain-model.md
  analysis/lab2.md
```

The dependency rule is `presentation → application → domain ← infrastructure`. The domain doesn't import anything from the other layers. Repository interfaces are defined in `src/domain/repositories/` and SQLite implementations in `src/infrastructure/repositories/` extend them. That's DIP.

## Docs

- Use cases UC-1 to UC-10: `docs/use-cases.md`
- Why I went with Rich Domain Model: `docs/adr/001-rich-domain-model.md`
- Comparison of lab 1 and lab 2: `docs/analysis/lab2.md`
