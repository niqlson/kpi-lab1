# Lab 2 — Analysis

The task asks 5 questions. Here are my answers.

## 1. What changed in the project structure compared to lab 1?

Lab 1 had 7 source files: 3 route files, 1 db file, 1 middleware, 1 utils, 1 server. Everything was mixed together. Each route handler did parsing, validation, SQL queries, business rules, and HTTP responses in the same function.

Lab 2 has about 36 source files split into 4 folders: `domain`, `application`, `infrastructure`, `presentation`. The dependency rule is `presentation → application → domain ← infrastructure`. The domain doesn't import anything from the other layers — I checked with grep. Repository interfaces sit in `src/domain/repositories/` and the SQLite implementations in `src/infrastructure/repositories/` extend them. Express controllers are now thin: parse the request, call a use case, serialize the response.

A lot of validation that used to look like `if (!body.X) return 400` in route handlers now lives inside entity constructors and mutator methods like `FitnessClass.changeCapacity()`. The "create vs update" rule duplication from lab 1 is gone — there's one constructor and one set of mutators per entity. Errors that used to be `res.status(409).json(...)` directly in handlers are now `throw new ConflictError(...)` from the domain. The mapping from domain errors to HTTP status codes lives in one file: `src/presentation/middleware/error-handler.js`.

## 2. What did splitting into layers give me?

Three things I actually noticed:

**Domain tests are fast.** I have 47 tests for the domain (entities, value objects, factories) and they all finish in around 25 ms total. They don't import Express, SQLite, JWT or bcrypt — their only dependencies are other domain files and Node built-ins. Compare that to integration tests which take 80–300 ms each because they spin up the whole stack.

**Business rules are easy to find.** If I want to know why capacity can't be lowered below the current bookings count, I open `FitnessClass.changeCapacity` and the rule is right there. In lab 1 I had to grep through route handlers and read around the surrounding HTTP code to find it.

**The repositories are interchangeable.** Use cases get a `BookingRepository` through their constructor. In production it's `SqliteBookingRepository`, in tests it's `InMemoryBookingRepository` from `tests/helpers/`. Both extend the same abstract class from the domain. The use case doesn't know or care which one it gets — that's DIP working as intended.

## 3. What drawbacks / complications appeared?

A lot more files. To trace what happens when someone books a class I now go through DTO → controller → use case → factory → entity → repository interface → repository implementation → mapper. That's 5+ files to read instead of 1.

Mappers are mostly boring boilerplate — renaming `startsAt` to `starts_at` and back. For 3 entities it's manageable. For 30 it would be tedious.

The PATCH endpoint got awkward. In lab 1 it was a single SQL UPDATE with whatever fields the body had. In lab 2 the use case has to walk through optional fields one by one and call the matching entity method (`rename`, `changeInstructor`, `reschedule`, `changeCapacity`). It's safer because each method re-validates, but it's more code.

Also, the entity constructors run all their invariant checks every time the mapper loads a row from the DB. If the DB ever has bad data, it'll throw immediately. Probably good behaviour but it's overhead I didn't have before.

## 4. How easy would it be to swap the database now?

Way easier than in lab 1. To go from SQLite to Postgres I would change:

- `src/infrastructure/db/connection.js` — swap `better-sqlite3` for `pg` (a few lines)
- `src/infrastructure/db/migrations.js` — rewrite the DDL for Postgres syntax
- `src/infrastructure/repositories/sqlite-*.js` — rewrite the SQL queries (method shapes stay the same)
- `src/presentation/composition-root.js` — instantiate the new repositories instead
- `package.json` — swap the dependency

Domain layer: zero changes. Application layer: zero changes. All 47 domain tests and 12 application tests would still pass without modification. Integration tests still test the same HTTP contract — only the underlying driver changes.

In lab 1's reflection I said this would be "at least 5 files and the changes are not mechanical" because SQL was sprinkled across all the route files. In lab 2 it's still about 5 files but now they're all in `infrastructure/` and the changes are mechanical — the contract above them is fixed.

For swapping Express to Fastify or even gRPC: domain and application stay untouched. Only `presentation/` would need to be rewritten — about 8 files.

## 5. Why Rich Domain Model and not Anemic?

Detailed in `docs/adr/001-rich-domain-model.md`. Short version:

The rules in this domain ("class isn't full", "class hasn't started", "capacity ≥ 1", "end is after start") are about state, and they should never be broken once an object exists. With Anemic those rules go into services. Every new entry point to "create a booking" has to remember to call the right validation. With Rich, the rules live on the entity — `FitnessClass.ensureCanAcceptBooking()` is the only function in the whole codebase that knows what "can accept a booking" means. You can't bypass it because there's no other way to set the state.

The cost is real: more files, more methods, constructor checks running every time a row is loaded. For this lab the point is to demonstrate the separation, and Rich makes the demonstration visible. For a real project of this size I'd probably pick Anemic and accept the tradeoff.
