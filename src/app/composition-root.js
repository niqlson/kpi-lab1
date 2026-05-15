// Composition root.
//
// The ONLY place that knows about all three modules + shared infrastructure.
// Each module exposes a single factory function. This file calls each one
// with the dependencies it needs (db, eventBus, jwtSecret, tokenService).
//
// After this file runs, modules cannot reach each other through Node imports
// — they communicate exclusively through the event bus or each other's
// public contracts.

const { SyncEventBus } = require('../shared/messaging/sync-event-bus');
const { AsyncEventBus } = require('../shared/messaging/async-event-bus');

const { buildCoreModule } = require('../modules/core');
const { buildAnalyticsModule } = require('../modules/analytics');
const { buildNotificationsModule } = require('../modules/notifications');

function buildContainer({ db, jwtSecret, communicationMode = 'async', notifier } = {}) {
  const eventBus = communicationMode === 'sync'
    ? new SyncEventBus()
    : new AsyncEventBus();

  // Modules — each registers its own subscribers as part of building.
  const core = buildCoreModule({ db, eventBus, jwtSecret });
  const notifications = buildNotificationsModule({ eventBus, notifier });
  const analytics = buildAnalyticsModule({ db, eventBus, tokenService: core.tokenService });

  return {
    eventBus,
    communicationMode,
    core,
    notifications,
    analytics,
  };
}

module.exports = { buildContainer };
