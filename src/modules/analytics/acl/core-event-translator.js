// ACL — the only place in Analytics that knows what Core events look like.
//
// Every field is renamed into Analytics's vocabulary:
//   userId        → actorId
//   classId       → resourceId
//   classTitle    → resourceTitle
//   occurredAt    → recordedAt / registeredAt
//
// If Core renames a field, only this translator changes.
// The rest of Analytics keeps using its own terms.

const { BookingMetric } = require('../domain/models/booking-metric');
const { CancellationMetric } = require('../domain/models/cancellation-metric');
const { RegistrationMetric } = require('../domain/models/registration-metric');

class CoreEventTranslator {
  toBookingMetric(event) {
    return new BookingMetric({
      id: event.eventId,
      actorId: event.userId,
      resourceId: event.classId,
      resourceTitle: event.classTitle,
      recordedAt: event.occurredAt,
    });
  }

  toCancellationMetric(event) {
    return new CancellationMetric({
      id: event.eventId,
      actorId: event.userId,
      resourceId: event.classId,
      resourceTitle: event.classTitle,
      recordedAt: event.occurredAt,
    });
  }

  toRegistrationMetric(event) {
    return new RegistrationMetric({
      id: event.eventId,
      actorId: event.userId,
      registeredAt: event.occurredAt,
    });
  }
}

module.exports = { CoreEventTranslator };
