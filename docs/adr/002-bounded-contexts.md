# ADR 002: Bounded Contexts — Core + Analytics + Notifications

- Status: accepted
- Date: 2026-05-15
- Context: Lab 5 — Modular Monolith

## What I'm deciding

Lab 5 requires splitting the project into at least two modules (Core + Analytics) inside one deployment. I have to justify the boundaries here.

## The boundaries I picked

**Core** — everything that owns the source-of-truth business state. Users, fitness classes, bookings. All commands that change the system go here. Writes are strongly consistent within Core (one DB, one transaction per command).

**Analytics** — read-only consumer that builds projections from Core's events. Owns its own tables (`analytics_booking_metrics`, `analytics_cancellation_metrics`, `analytics_registration_metrics`) and its own internal vocabulary (`actor`, `resource`, `recordedAt`). Eventually consistent with Core.

**Notifications** — also a read-only consumer of Core events, but instead of building data projections it triggers side effects (sends notifications via the `Notifier` port). Was already a separate component since lab 4; lab 5 just upgrades it to a proper module with its own ACL.

## Why these boundaries and not others

Three reasons in order of importance:

**1. Different reasons to change.** Core changes when business rules change ("admins can override capacity"). Analytics changes when reporting needs change ("we want average bookings per instructor"). Notifications changes when delivery channels change ("now we send SMS"). Mixing them means every reporting tweak risks the booking flow.

**2. Different consistency requirements.** Booking a class must NOT double-book the slot — that's a strong-consistency rule that has to be enforced inside one transaction in Core. Counting bookings for a popularity dashboard can lag by seconds and nobody cares — that's eventual consistency between Core and Analytics. Splitting the modules makes this difference enforceable: Analytics can't accidentally try to validate against Core's tables because it can't see them.

**3. Different vocabularies.** A "booking" in Core is a domain aggregate with a status, owner, and class reference. A "booking" in Analytics is a row in a metric table identified by event ID, with the actor and resource flattened out. Trying to share one `Booking` type forces both contexts to compromise — Core gets aggregation fields it doesn't need, Analytics gets domain methods it doesn't want. Different contexts → different models.

## Alternatives I considered

- **One module per HTTP path group** (auth/, classes/, bookings/). Rejected: those are presentation concerns. Auth and bookings change together when business rules change, so they belong in the same context.

- **Per-entity modules** (users-module, classes-module, bookings-module). Rejected: bookings depend so tightly on classes (capacity, time slot, "class hasn't started") that splitting them would create constant cross-module chatter for trivial questions.

- **Three-way split: Core + Analytics + Reporting**, where Reporting is a separate read-only module. Rejected for now: my Analytics module already does both projection-building and serving the queries. If reporting concerns grow more complex, splitting them later is mechanical (the data is already in dedicated tables).

## Consequences

**Positive**

- Adding a new analytics dimension (e.g. "instructor stats") is changes inside Analytics only. Core does not even compile differently.
- Notification delivery channel (e.g. switch InMemoryNotifier → SES) is one composition-root line change.
- The Analytics module could be extracted into a separate process tomorrow: it already only consumes events and only writes its own tables. The communication is already async.

**Negative**

- More files. Same business operation now goes through more layers of indirection.
- Eventual consistency: a user who books a class and immediately checks `/api/analytics/me` may see stale data for a fraction of a second. This is documented and tested.
- Two ACLs (one in Notifications, one in Analytics) duplicate a small amount of mapping logic. If Core changes a field name, both ACLs need updating — but only the ACLs.
- A shared SQLite file means modules technically *could* read each other's tables. Discipline (and code review) prevents it. A real distributed setup would use separate databases.
