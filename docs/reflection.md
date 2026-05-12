# Self-Reflection — Lab 1

Honest answers about the baseline code, before any refactoring.

## Architecture

### 1. Where does business logic live?

Most of the business logic sits **inside the route handlers in `src/routes/*.js`**.
A handler typically does three things in sequence: parses and validates the request
body, runs SQL queries directly through `better-sqlite3`, and shapes the response.
The only piece that is genuinely isolated is `src/utils/validation.js`, which holds
pure functions for checking emails, dates, capacity, and the `validateClassInput`
rule set; those are easy to unit-test on their own.

Everything else — checking that a class has not started, that the user does not
already have a booking, that capacity is not exceeded, that capacity in PATCH is
not lowered below current bookings — is written as plain `if` statements inside
handlers, mixed with HTTP responses and SQL. There is no service layer and no
domain model. The handlers know about HTTP *and* about persistence *and* about
business rules at the same time.

### 2. How are DB models tied to business logic?

There are **no separate domain objects**. The "model" is whatever row
`better-sqlite3` returns from a query — a flat object with snake_case columns
(`starts_at`, `user_id`, etc.). The only conversion happens in tiny
`xToDto` functions (`userToDto`, `classToDto`, `bookingToDto`) that rename keys
to camelCase before responding. Business rules operate directly on these raw
rows: I do `new Date(cls.starts_at) <= new Date()` right in the booking handler.

The implication is that the database schema *is* the domain model. Any rename of
a column (`starts_at` → `start_time`) would force changes in handlers, DTO
converters, and tests. There is no invariant-protecting class — nothing prevents
me from constructing a "class" with `endsAt < startsAt` *inside the code*; the
guard exists only at the HTTP entry point.

### 3. How easy is it to swap the database?

**Not easy.** I would have to touch every route file plus `src/db.js`.
Concretely: `src/routes/auth.js`, `src/routes/classes.js`, and
`src/routes/bookings.js` each contain hand-written SQL via `db.prepare(...)` —
those are all SQLite-flavoured queries (e.g. `datetime('now')`, `INTEGER
PRIMARY KEY AUTOINCREMENT`, the `UNIQUE(user_id, class_id)` constraint). To move
to MongoDB I would have to rewrite every single query, replace the migration
DDL with collection setup, swap `db.prepare().get()/.all()/.run()` for the Mongo
driver's calls, and probably rethink the cascade-on-delete behaviour that
SQLite's foreign keys give me for free. So: at least 5 files, and the changes
are not mechanical — they require redesign for the new data model.

### 4. How easy was it to test?

The **unit tests** are pleasant — `validation.js` has no dependencies on
Express, JWT, or the database, so its tests just import the functions and
assert against return values. They run in milliseconds.

The **integration tests** are also fine to *write*, because `better-sqlite3`
supports `:memory:` databases and I exposed `createApp({ db, jwtSecret })` so
each test gets a fresh app with a clean DB. But notice what this implies: I
cannot test the booking logic *without* spinning up Express, the JWT layer, and
a SQLite engine. There is no way to ask "does the rule 'capacity not exceeded'
work?" in isolation — I can only ask it via an HTTP request that goes through
auth, JSON parsing, routing, SQL, and back. If I wanted to test a tricky
business rule, the only path is an integration test.

## Scaling

### 5. How easy would it be to scale 100×?

The first things that would break are **the database and the local file
system**. SQLite is a single-file embedded database; it does not allow multiple
processes to write concurrently without contention, so the moment I want more
than one Node instance behind a load balancer, the `data/app.db` file becomes
the bottleneck. I would have to migrate to PostgreSQL/MySQL — and per question
3, that touches most files in the project.

I also have **no concurrency control on bookings**. The "check capacity, then
insert" pattern is two separate statements; under 100× load, two requests can
both read `count = 14` for a class with capacity 15 and then both insert,
producing 16 bookings. The `UNIQUE(user_id, class_id)` constraint protects
against duplicate bookings, but nothing protects against over-capacity. A real
fix would be a transaction with `SELECT ... FOR UPDATE` (or a single atomic
`INSERT ... WHERE (SELECT COUNT ...) < capacity`).

For statelessness I got lucky: I deliberately used JWTs rather than sessions,
so there is no in-memory session state, no global caches, and no per-instance
state — multiple Node instances *would* serve requests correctly, the only
shared state lives in SQLite. But `JWT_SECRET` is a single env var; rotating it
invalidates all tokens, and the seed-admin logic runs on every boot, which is
fine but wasteful at high replica counts.

Architecturally, the changes I would make: extract a service / use-case layer
so the booking rule lives in one place and can wrap a transaction; put the
database behind a repository interface so swapping engines is a focused change;
add idempotency keys on `POST /bookings` so retries from clients do not double-book;
and add an index on `bookings(class_id)` to keep the capacity check fast at scale.
