# Lab 3 — Analysis

The task asks 6 questions. Here are my answers.

## 1. What changed in the project structure compared to lab 2?

Lab 2 had `src/application/use-cases/` with one file per business operation (`book-class.js`, `register-user.js`, etc.). Each use case did everything: validate, run domain logic, save, sometimes return the full entity.

Lab 3 splits that into two folders:

- `src/application/commands/` — write operations. Each file has a `XxxCommand` class (just data, no logic) and a `XxxHandler` class with a `handle(command)` method. There are 7 commands.
- `src/application/queries/` — read operations. Same shape: `XxxQuery` + `XxxHandler` with `handle(query)`. There are 4 queries.

Two more new things on the read side:

- `src/application/queries/ports/` — interfaces for **read repositories**. Separate from the domain repositories.
- `src/infrastructure/read-repositories/` — SQLite implementations that return Read Models (plain DTOs) directly via raw SQL. They bypass the domain entirely.

Controllers got smaller. They used to call `useCase.execute({ ... })` and then map the returned domain entity to a response DTO (via `src/presentation/dto/`). Now they build a Command or Query object, call `handler.handle(...)`, and return the result as JSON. The `presentation/dto/` folder is gone — Read Models come straight from the queries already shaped for the client.

The HTTP API also changed because of strict CQS: `POST /api/classes` now returns `{id}` instead of the full class; `PATCH` returns `{id}`; `DELETE` returns 204 with no body. To see the result of a write you do a separate GET. Auth endpoints return `{userId, token}` instead of `{user, token}`.

## 2. What did CQS give me?

**Reads got faster and more useful.** The old `list-my-bookings` use case loaded each booking as a domain entity, then for each booking it loaded the class as another domain entity (an N+1 query). The new `BookingReadRepository.findByUser` does one SQL JOIN and returns flat Read Models with the class info already embedded. For 50 bookings: 51 SELECTs before, 1 SELECT now.

`GET /api/classes` now also includes `bookingsCount` on each class — the SQL has a correlated `(SELECT COUNT(*) FROM bookings WHERE class_id = c.id)`. That field doesn't exist on the domain entity at all. It belongs to the read side, not to the model.

**Command tests are clean unit tests.** I have 19 command tests in `tests/unit/commands/`. They construct a Command object, pass it to a Handler, and assert against fakes. Total runtime: about 60 ms. They test "what should happen when the rule is broken" exactly the way the lab task describes.

**Query tests are integration tests by nature.** I have 11 query tests in `tests/integration/queries/`. They go through the full HTTP stack and a real SQLite DB because that's what they're actually validating — that the SQL produces the right shape, that the JOIN works, that `bookingsCount` is correct. Mocking would defeat the point.

**Controllers stopped doing two jobs.** Before: parse request → validate → call use case → map entity → respond. Now: parse request → build Command/Query → call handler → respond. There's no entity-to-DTO mapping in the controller because queries already return the right shape. Controllers shrank by about half.

## 3. What got worse?

**More files for the same work.** Booking a class now goes through: controller → BookClassCommand → BookClassHandler → BookingFactory → Booking entity → BookingRepository → SqliteBookingRepository → BookingMapper. That's 7+ files for one operation. In lab 2 it was 6.

**Two repositories per entity.** Each entity now has a write repository (returns domain entities) and a read repository (returns DTOs). For 3 entities that's 6 repository interfaces + 6 implementations + 6 mapper-or-row-shape files. The first time you add a new entity, doing both sides feels like a chore.

**The API got less convenient.** `POST /api/classes` returning just `{id}` means the client has to make a follow-up `GET /api/classes/:id` to see the full resource. Real APIs usually return the created resource for exactly that reason. Strict CQS pays a usability cost here.

**Two paths through the system makes "where is the bug?" harder.** If `bookingsCount` shows the wrong number, the bug could be in the read repository SQL OR in the booking command not committing — same data, two paths.

## 4. How is Command/Query Handler different from a Service that does everything?

A traditional Service has methods like `bookingService.book(userId, classId)`, `bookingService.cancel(bookingId)`, `bookingService.list(userId)`, `bookingService.find(id)`. All in one class. The class grows. Reading it tells you nothing about what the system does until you scan all the methods.

A Command Handler has exactly one method (`handle`) and one responsibility (handle this one specific command). Looking at `src/application/commands/` shows you the full list of write operations. Looking at `src/application/queries/` shows you all the reads. There's no big "BookingService" class for things to hide in.

Concretely:

- A Command is a typed object. `new BookClassCommand({ userId, classId })` is self-documenting and you can't accidentally pass arguments in the wrong order.
- A Service method takes positional or loose arguments. `bookingService.book(userId, classId)` — was that `(user, class)` or `(class, user)`? Easy to mix up.
- Commands are dispatched. The controller has no idea what `BookClassHandler` does internally — it just hands over the command. With a Service, the controller needs to know which service method to call.
- Tests for a single command live next to it and only cover that one operation. With a Service, tests bloat as the service grows.

## 5. How does CQS affect extensibility?

**Adding a new write is a new file.** "Mark booking as attended" → I create `mark-booking-attended.js` with a Command + Handler, register it in the composition root, expose it in the controller. Nothing else changes. No risk of breaking unrelated commands.

**Adding a new read is also a new file.** "Show monthly stats per instructor" → I create the Query, the Handler, optionally a new method on a read repository. Domain code, write commands, and other queries are not touched.

In lab 2 with use cases it was already fairly extensible (one file per use case). CQS makes the categories sharper: I know immediately whether the new feature is a command or a query, which folder it goes in, which testing approach to use, and whether to involve the domain.

The bigger extensibility win is on the read side. Adding a new screen often just means a new query that does whatever JOIN/projection that screen needs. No new entity, no new domain rule, no risk of breaking a write. The read side becomes "data shaping" infrastructure that screens consume.

## 6. Does the data structure returned by a Query differ from the domain model? Why does it matter?

Yes, and the difference matters in two specific places in this project:

**`FitnessClassReadModel` includes `bookingsCount`** — the count of bookings for the class. The domain `FitnessClass` entity doesn't have this field. It can't have it: the count depends on rows in the `bookings` table, which is a different aggregate. Putting `bookingsCount` on the entity would couple the FitnessClass aggregate to the Booking aggregate — exactly what the Aggregates lecture warns against. But the client wants this number to show on the class list page. A Read Model can produce it via SQL without touching the domain at all.

**`BookingReadModel` has a denormalised `class` object** — the booking's class title, instructor, startsAt, endsAt are flattened into the response. The domain `Booking` entity only stores `classId` (per the "reference other aggregates by id" rule). Showing the user a list of bookings as just `[{ classId: 'uuid', ... }]` would be useless — they'd need a second request per booking to get the class info. The Read Model JOINs class info into the row in one SQL query.

Why it matters: domain models are shaped to enforce business rules. They want strict aggregates, ID references, no denormalisation, and they explicitly ban fields that depend on data outside the aggregate. UIs want the opposite — flat, denormalised, prejoined data they can render directly. Trying to satisfy both with one model produces either a domain that's polluted with display fields, or an API that's slow because the client does N+1 fetches by hand. Splitting into Read Models lets each side optimise for its actual job — the domain stays clean, the API stays fast.
