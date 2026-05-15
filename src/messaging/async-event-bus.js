const { EventBus } = require('./event-bus');

// Asynchronous in-process bus.
// publish() returns immediately; subscribers run on the next tick.
// The command's response is built without waiting for side effects.
class AsyncEventBus extends EventBus {
  #subscribers = new Map();
  #onError;
  #pending = new Set();

  constructor({ onError } = {}) {
    super();
    this.#onError = onError ?? ((err, event) => {
      console.error(`[async-event-bus] subscriber failed for ${event.eventName}:`, err.message);
    });
  }

  subscribe(eventName, handler) {
    if (!this.#subscribers.has(eventName)) this.#subscribers.set(eventName, []);
    this.#subscribers.get(eventName).push(handler);
  }

  publish(event) {
    const handlers = this.#subscribers.get(event.eventName) ?? [];
    const work = (async () => {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (err) {
          this.#onError(err, event);
        }
      }
    })();
    // Track in-flight work so tests can wait for delivery to complete.
    this.#pending.add(work);
    work.finally(() => this.#pending.delete(work));
    // publish returns synchronously — nothing is awaited
  }

  // For tests / graceful shutdown: wait for all currently-publishing events to finish.
  async drain() {
    while (this.#pending.size > 0) {
      await Promise.allSettled([...this.#pending]);
    }
  }
}

module.exports = { AsyncEventBus };
