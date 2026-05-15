// Port that command handlers depend on.
// They publish events; they do not know who subscribes.
class EventBus {
  subscribe(_eventName, _handler) { throw new Error('EventBus.subscribe not implemented'); }
  publish(_event) { throw new Error('EventBus.publish not implemented'); }
}

module.exports = { EventBus };
