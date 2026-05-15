# Lab 4 — Analysis

The task asks 6 questions. Here are my answers.

## 1. What changed compared to lab 3?

Lab 3 was strictly request-response: every command did its work and returned. Nothing happened "in the background". Lab 4 introduces a side-effect subsystem and two ways the command handler can talk to it.

Two new top-level folders appeared:

- `src/notifications/` — the auxiliary component. `Notifier` is the interface; `InMemoryNotifier` records sent notifications (handy for tests and the lab demo); `ConsoleNotifier` logs to stdout for dev mode; `FailingNotifier` always throws so I can test failure handling.
- `src/messaging/` — the in-process event infrastructure. `EventBus` is the interface; `SyncEventBus` and `AsyncEventBus` are the two implementations the lab requires. Three integration events live in `events/` (`BookingCreated`, `BookingCancelled`, `UserRegistered`). One subscriber lives in `subscribers/notification-subscriber.js`.

Three command handlers (`register-user`, `book-class`, `cancel-booking`) gained an optional `eventBus` dependency and publish an event after their main operation succeeds. The handler does NOT call the notifier directly — it doesn't even know the notifier exists.

The composition root reads `COMMUNICATION_MODE=sync|async` and instantiates either bus. The notification subscriber registers on whichever bus is built. Same handler code, different runtime behaviour.

## 2. What side effects did I pick and why?

Notifications:

- on `UserRegistered` → welcome message
- on `BookingCreated` → confirmation (with class title and start time)
- on `BookingCancelled` → cancellation notice

I picked notifications because they're the canonical example in the lectures, they make the response-time difference between sync and async observable (a notification call can take real time — sending email, hitting a third party), and they obviously shouldn't fail the main booking just because the email service is down. Audit logging would also have worked but it's near-instant so the sync vs async difference would be invisible.

## 3. Sync vs async comparison (with real numbers)

I added a configurable delay to `InMemoryNotifier` (`delayMs`) so the difference is measurable. The integration test in `tests/integration/communication/sync-vs-async.test.js` does the actual measurement.

### Response time

With `delayMs = 80` on the notifier:

| Mode | Observed in test | Why |
|---|---|---|
| `sync` | ≥ 80 ms | The handler awaits the notifier call before responding. Total = booking save + notification. |
| `async` | < 80 ms (a few ms in practice) | `AsyncEventBus.publish()` returns immediately, the notification runs after the response is sent. |

In the live smoke test in async mode, `POST /api/bookings` came back in **12 ms**. The notification happened a fraction of a second later, in the background.

### Behaviour on failure

I used `FailingNotifier` which throws on every method:

| Mode | What the API client sees | What happens to the side effect |
|---|---|---|
| `sync` | 201 Created — the booking still succeeds | The notifier throws; `SyncEventBus` catches it, logs via `onError`, continues. Policy chosen: **log and continue**. |
| `async` | 201 Created — the response was already sent before the subscriber even ran | Same — error is caught by the bus, logged, the booking is unaffected. |

In sync mode I had to make a real choice: roll back the booking if the notifier fails, or accept the side effect failure silently? I chose log-and-continue because notifications are not part of the business invariant — the booking is still valid even if the email never goes out. If I needed atomicity I'd have to pull in something like saga/outbox.

### Coupling

| | Sync mode | Async mode |
|---|---|---|
| Does the handler know `Notifier` exists? | No (it talks to `EventBus`) | No (same) |
| Does the handler know which subscribers exist? | No | No |
| What happens if I add a second subscriber (e.g. analytics)? | Add `analyticsSubscriber.registerOn(bus)` in composition root. Handler is not touched. | Same — adding a subscriber is one line in the composition root. |

Both modes use the same command handler code. The handler depends only on `EventBus` — that's the entire interface it knows about. This is the lecture's "minimum coupling" example.

(If I had instead implemented sync as "handler imports Notifier and calls it directly", the coupling story would be very different — the handler would import the notifier interface, would have to handle its errors, and adding a second subscriber would mean editing the handler. I considered that approach and decided against it because using the bus in both modes lets the same handler work in both, which is what the composition root actually does at runtime.)

### Implementation and testing complexity

Sync mode: easy. The behaviour is deterministic — `await bus.publish(event)` runs the subscribers and you can immediately assert on the notifier. Tests look like normal sync tests.

Async mode: harder.

- I had to add `AsyncEventBus.drain()` so tests can wait for the queued work to finish before asserting. Without it the test would race the subscriber and intermittently fail.
- Subscriber errors don't propagate to the publisher. If a subscriber throws and there's no test for it, the bug is silent. I made errors go through an `onError` hook that's logged by default but configurable, so tests can capture them.
- The integration test needed to grab the bus from the container and explicitly drain it: `await container.messaging.eventBus.drain()`. That's an extra step the sync test doesn't need.

Roughly: the sync code path is ~30 lines, the async code path is ~50 lines including the drain bookkeeping. Testing async carefully is the bigger overhead.

## 4. Which would I pick for production?

For *this specific side effect* (notifications): **async**. Notifications are the textbook case — they should not block the booking response, they should not fail the booking, and they have natural retry semantics (the next event handler can re-send). The 50 ms latency win on the booking endpoint is real.

But I would not pick async for everything. The lab lecture's decision rules are good:

- Need the result before responding → sync (e.g. payment authorisation, where "no charge" means "no booking")
- Result can be deferred → async (notifications, audit, analytics, search index updates, third-party webhooks)
- Multiple consumers care → async with pub/sub (the value is in not having the publisher know who listens)

In production I'd also swap `AsyncEventBus` for a real broker (Redis, RabbitMQ) once the system has more than one process, because the current bus doesn't survive a process restart — events in flight when the process dies are lost. For an in-process monolith, the lectures' "publish after commit" pattern is good enough.

## 5. What if the same event is delivered twice? Are my handlers idempotent?

In the current in-process bus, duplicate delivery cannot happen unless I publish the same event twice from the handler — and I don't. But the lecture is right that any production-grade messaging is at-least-once, so I implemented idempotency anyway:

- Every event has a `eventId` (UUID assigned in the constructor)
- `NotificationSubscriber` keeps a `Set<eventId>` of processed events
- On every event, it checks `alreadyProcessed(event)` and short-circuits if so

There's a unit test for this — `NotificationSubscriber is idempotent — same eventId delivered twice = one notification`. It publishes the *same event object* twice through the bus and asserts the notifier was called only once.

This is the simplest deduplication strategy. In a real distributed system the `Set` would be a Redis key with a TTL or a unique index in a database, so the dedup state survives restarts.

I also added a paired test that two *distinct* events with the same payload produce two notifications, to make sure I'm not accidentally deduplicating by payload (which would be wrong — those represent two real-world events that both need to be acted on).
