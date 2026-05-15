# Lab 5 — Analysis

This is the final lab. The first part answers the lab 5 questions. The second is a course retrospective covering labs 1 through 5.

---

## Part 1 — Lab 5 questions

### How did I choose the boundaries? What alternatives did I consider?

Detailed in `docs/adr/002-bounded-contexts.md`. Short version:

The system splits into three modules: **Core** (writes — users, classes, bookings; strongly consistent), **Analytics** (read-only consumer that builds its own projections from Core events; eventually consistent), and **Notifications** (read-only consumer that triggers notification side effects from Core events). I picked these boundaries because each module has a *different reason to change*: Core changes for business rules, Analytics for reporting needs, Notifications for delivery channels.

Alternatives I considered and rejected:

- **One module per HTTP path group** (auth/classes/bookings) — that's a presentation split, not a domain split. Auth and bookings change together for business reasons.
- **One module per entity** (users / classes / bookings as separate modules) — bookings depend tightly on classes (capacity, time validity, "has it started"). Splitting would create constant cross-module chatter.
- **Splitting Analytics into "projection-builder" + "reporting-API"** — would be the right move if Reporting got more complex, but for the lab's scope, having Analytics own both is fine. The data already lives in dedicated tables, so a future split would be mechanical.

### How does the ACL protect modules from changes in other modules?

The ACL is the *single place* in a downstream module that knows what an upstream module's events look like. In our case Analytics's ACL is `src/modules/analytics/acl/core-event-translator.js` (35 lines). It contains:

- `toBookingMetric(event)` — turns Core's `BookingCreated` into a `BookingMetric` (Analytics's internal type)
- `toCancellationMetric(event)` — same for `BookingCancelled`
- `toRegistrationMetric(event)` — same for `UserRegistered`

Outside this file, Analytics does not know that `userId` exists. It only knows `actorId`. It does not know that `classId` exists. It only knows `resourceId`. The renaming is real, not cosmetic — a `grep userId src/modules/analytics/` returns zero hits everywhere outside `acl/`.

What this protects against:

- **Field renames.** If Core renames `userId` → `customerId`, only `core-event-translator.js` changes. The 5 internal model files, 3 command handlers, 2 query handlers, repositories, projections, and HTTP controllers all stay byte-identical.
- **New optional fields.** Core can add a new field to `BookingCreated` and Analytics simply ignores it (the ACL doesn't pull it through).
- **Conceptual mismatch.** Core's "user/booking" vocabulary doesn't have to match Analytics's "actor/resource" vocabulary. Each context can use the words that make sense for its own purpose.

The same pattern is in place for Notifications (`src/modules/notifications/acl/core-event-translator.js`), where Core fields are translated into `recipientEmail`, `eventTitle`, etc. — Notifications-internal terms.

### Where is strong consistency, where is eventual consistency, why is this acceptable?

**Strong consistency** lives inside each module, in single-aggregate transactions:

- *Booking a class* — Core's `BookClassHandler` checks "class exists, isn't started, has capacity, no duplicate" and inserts the booking row. All within one SQLite transaction. If two clients race for the last spot, one wins, the other gets `409 Conflict`. There is no window where the count is stale.
- *Recording a metric in Analytics* — `RecordBookingHandler` uses `INSERT OR IGNORE` against `analytics_booking_metrics` keyed by event ID. Within Analytics's own tables, this is strongly consistent and idempotent.

**Eventual consistency** lives *between* modules, on the event bus:

- *Booking → analytics projection* — The `BookingCreated` event is published after the booking is committed in Core. The Analytics subscriber processes it on the next tick. The window between commit and projection update is typically <1 ms in tests, but it is not zero, and it is not guaranteed to be small under load.
- *Booking → confirmation notification* — Same path. The user sees `201 Created` before the notification is even attempted.

Why it's acceptable:

- "How many bookings does Yoga have right now?" is a *display* question. If the answer is one short for a few hundred milliseconds, no business rule breaks. Nobody is making a booking decision based on the popularity dashboard.
- Notifications can lag without consequence — an email arriving 500 ms after the booking is invisible to the user.
- The thing we cannot afford to lag is "can this user book this class?" — and that's exactly what we keep strongly consistent inside Core.

The CAP lecture's framing is the right one: per-operation choice. Booking creation is CP (we'd rather refuse than double-book). Analytics is AP (we'd rather show slightly old numbers than refuse to render the page).

### What changes if Analytics has to be extracted into a separate service?

Way less than it would have without lab 5. Concretely:

1. **Communication.** Today Analytics subscribes to the same in-process event bus that Core publishes to. In a separate service, that becomes a real broker (RabbitMQ / Kafka / Redis Streams). Core's publisher calls don't change — it still calls `eventBus.publish(BookingCreated)`. The bus implementation gets swapped to publish over the network.
2. **Database.** Today Core and Analytics share one SQLite file but only touch their own tables. In a split, Analytics gets its own database. Schema doesn't change — it's already separate tables with `analytics_*` prefix.
3. **HTTP routes.** `/api/analytics/*` moves to its own server process. The Express composition in `src/app/app.js` would stop mounting `container.analytics.router` — the analytics service mounts its own.
4. **Auth.** Analytics's HTTP routes use the same JWT verifier (`src/shared/auth/`). That can be lifted into the analytics service, or analytics can do its own token verification with the same secret.

What does NOT change:

- Analytics's own domain models, ACL, commands, queries, repositories. Already isolated.
- Core. It still publishes the same events. It doesn't know who reads them.
- Notifications. Same story — could either stay with Core or extract independently.

The boundaries already exist. The split would be infrastructure work (new deployment, message broker, separate DB), not refactoring of business code. That's the value lab 5 produces.

---

## Part 2 — Course retrospective (labs 1 → 5)

### How did the architecture evolve?

| Lab | What was added | What it cost |
|---|---|---|
| 1 | Working REST API in 7 files. Routes did everything inline. | Nothing — the goal was a baseline. |
| 2 | 4 layers (presentation/application/domain/infrastructure), Rich Domain Model, factories, Domain Errors. ~36 source files. | More files; mapper boilerplate; constructor checks on every load. |
| 3 | CQS — application split into Commands and Queries. Read-side bypasses domain via separate `ReadRepositories`. Controllers became thin. | API contract change (commands return only `{id}`); two repository surfaces per entity. |
| 4 | Notifications as a side-effect subsystem. In-process EventBus with sync and async implementations. Idempotency by `eventId`. | Async makes debugging harder; failure handling in async mode is silent unless explicitly captured. |
| 5 | Modular monolith — `src/modules/{core,analytics,notifications}` each with full internal architecture. ACL between modules. Cross-module communication via the existing event bus. New Analytics module owns its own tables and projections. | Two ACLs to keep in sync if Core renames a field; eventual consistency between modules; controller/path depth got deeper, more `../../` in imports. |

The shape that comes out at the end is recognisably what the industry calls "Clean Architecture / Hexagonal / Ports-and-Adapters with Modular Monolith". That label only really makes sense after walking through all five labs.

### Which architectural decisions were the most valuable?

**Top three, in order:**

1. **Domain layer with no external imports (lab 2).** Once the domain stopped depending on Express, SQLite, JWT, and bcrypt, the domain tests became proper unit tests. They run in tens of milliseconds and they prove business rules without spinning up infrastructure. The 47 domain tests are the most-run code in the project — every other change is verified against them in 25 ms. This single rule did more for development speed than anything else.

2. **DIP via repository interfaces in the domain (lab 2).** Defining `BookingRepository` in `domain/repositories/` and implementing it in `infrastructure/repositories/` is the move that made every later lab possible. The same interface lets us back commands with a real SQLite repo in production, an in-memory fake in unit tests, and a JOIN-optimised read-side repo in queries. Without DIP the layered split would be pointless cosmetics.

3. **Events as the cross-module communication mechanism (labs 4 + 5).** A handler that publishes `BookingCreated` doesn't know who listens. Adding Analytics in lab 5 was just "subscribe to the events". Adding Notifications in lab 4 was the same. If we wanted to add a third consumer (e.g. a search-index updater), it would be one more `eventBus.subscribe(...)` line. Everything else in the system stays the same.

The thing I was most skeptical of going in was domain factories — they felt like ceremony. After lab 5 they're clearly worth it: the "is this booking valid?" question has exactly one answer, in `BookingFactory`, and it does the right thing whether the call comes from a user POST, an admin batch import, or a future cross-module call.

### What would I do differently knowing the end result?

**A few things:**

- **Use UUIDs from lab 1.** I switched IDs from integers to UUIDs in lab 2 because the Rich entity wanted a valid ID at construction time. That was an API breaking change between labs. If I'd known, I'd have used UUIDs from the start.
- **Put the event bus in shared from lab 4, not lab 5.** I introduced it under `src/messaging/` in lab 4, then had to move it under `src/shared/messaging/` in lab 5. Knowing it was always going to be cross-cutting, I'd have put it in shared from the start.
- **Have the test-app helper from lab 1.** Each lab needed `buildTestApp()` and each lab I had to update its API. If I'd built it once with a stable shape (`{app, container}`), the test rewrites between labs would have been smaller.
- **Skip Anemic-vs-Rich agonising.** In the lab 2 ADR I went back and forth on this. The right answer for any project that's going to have CQS and modules later is Rich Model — the rules need a consistent home. Anemic only really works if you commit to keeping everything in services forever.

What I would NOT change is the lab order. Building each layer on top of the previous one (instead of the "do everything at once") made each pattern's actual value visible. Layered architecture by itself was just files in folders; only after CQS and events did the layering pay off.

### What trade-offs between simplicity and flexibility did I see?

The pattern is the same at every step of the course: each lab traded simplicity for flexibility, and the trade was worth it as soon as the next lab needed the flexibility — and not really before that.

- Lab 1's 7 files were *simpler* than lab 2's 36. But adding events would have been a nightmare in lab 1's architecture.
- Lab 3's CQS was *more files* than lab 2's monolithic use cases. But the read-side optimisation (bookings JOIN, popularity counts) would have polluted the domain model without it.
- Lab 4's events were *more code* than direct calls. But adding the Analytics module in lab 5 would have meant editing every Core handler if Notifications hadn't already abstracted that pattern.
- Lab 5's modules add *deeper folders and ACLs* over lab 4's flat layout. But they make Analytics extractable into a separate service without rewriting business code.

The honest version: at every lab's *own* level of complexity, the previous lab's choice was the right one. The ROI of architecture only shows up one or two changes later. If this had been a 1-shot project (just lab 1), every later lab's structure would have been overkill. Because the project kept growing, each step paid back.

The big lesson is: **complexity isn't bad — uncoordinated complexity is bad**. By the end, this project has 130 source files and 130 tests and ~5 architectural patterns layered on each other. But you can find the rule for "can this user book this class?" in one place. You can swap SQLite for Postgres by editing one folder. You can add a new event consumer by writing one new module. That's what the architecture is buying.
