const { EventBus } = require('./event-bus');

// Synchronous in-process bus.
// publish() awaits every subscriber. The caller (command handler) waits for
// all side effects to complete before its response is built. Equivalent
// to a direct call from the handler — coupling is just hidden behind the bus.
class SyncEventBus extends EventBus {
  #subscribers = new Map();
  #onError;

  constructor({ onError } = {}) {
    super();
    this.#onError = onError ?? ((err, event) => {
      console.error(`[sync-event-bus] subscriber failed for ${event.eventName}:`, err.message);
    });
  }

  subscribe(eventName, handler) {
    if (!this.#subscribers.has(eventName)) this.#subscribers.set(eventName, []);
    this.#subscribers.get(eventName).push(handler);
  }

  async publish(event) {
    const handlers = this.#subscribers.get(event.eventName) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        // Policy: log and continue. The command's main op already succeeded —
        // a failed notification should not roll it back.
        this.#onError(err, event);
      }
    }
  }
}

module.exports = { SyncEventBus };
