// Analytics module — public contract.
//
// Builds the module: runs Analytics's own migrations, wires its repositories,
// commands, queries, ACL, and the events subscriber that bridges Core's
// integration events into Analytics's internal commands.

const { runAnalyticsMigrations } = require('./infrastructure/db/migrations');
const { SqliteMetricRepository } = require('./infrastructure/repositories/sqlite-metric-repository');
const { SqliteProjectionsReadRepository } = require('./infrastructure/repositories/sqlite-projections-read-repository');

const { CoreEventTranslator } = require('./acl/core-event-translator');

const { RecordBookingHandler } = require('./application/commands/record-booking');
const { RecordCancellationHandler } = require('./application/commands/record-cancellation');
const { RecordRegistrationHandler } = require('./application/commands/record-registration');
const { ListPopularResourcesHandler } = require('./application/queries/list-popular-resources');
const { GetActorActivityHandler } = require('./application/queries/get-actor-activity');

const { CoreEventsSubscriber } = require('./subscribers/core-events-subscriber');
const { buildAnalyticsRouter } = require('./presentation/analytics-controller');

function buildAnalyticsModule({ db, eventBus, tokenService }) {
  // 1. Analytics owns its own tables.
  runAnalyticsMigrations(db);

  // 2. Wire internals.
  const metricRepository = new SqliteMetricRepository(db);
  const projectionsReadRepository = new SqliteProjectionsReadRepository(db);
  const translator = new CoreEventTranslator();

  const handlers = {
    recordBooking: new RecordBookingHandler({ metricRepository }),
    recordCancellation: new RecordCancellationHandler({ metricRepository }),
    recordRegistration: new RecordRegistrationHandler({ metricRepository }),
    listPopularResources: new ListPopularResourcesHandler({ projectionsReadRepository }),
    getActorActivity: new GetActorActivityHandler({ projectionsReadRepository }),
  };

  // 3. Subscribe to Core integration events.
  if (eventBus) {
    new CoreEventsSubscriber({ handlers, translator }).registerOn(eventBus);
  }

  // 4. Expose router for app composition.
  return {
    router: buildAnalyticsRouter({ handlers, tokenService }),
  };
}

module.exports = { buildAnalyticsModule };
