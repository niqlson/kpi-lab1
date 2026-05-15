// ACL — Anti-Corruption Layer.
//
// This file is the ONLY place in the Notifications module that knows the
// structure of Core's event classes. Everywhere else inside Notifications
// works with the internal payload shapes returned here.
//
// If Core ever renames `BookingCreated.email` to `BookingCreated.userEmail`,
// only this file needs to change.

class CoreEventTranslator {
  toWelcomePayload(event) {
    return {
      recipientUserId: event.userId,
      recipientEmail: event.email,
      recipientName: event.name,
    };
  }

  toBookingConfirmationPayload(event) {
    return {
      recipientUserId: event.userId,
      recipientEmail: event.email,
      recipientName: event.name,
      bookingReference: event.bookingId,
      eventTitle: event.classTitle,
      eventStartTime: event.startsAt,
    };
  }

  toBookingCancellationPayload(event) {
    return {
      recipientUserId: event.userId,
      recipientEmail: event.email,
      recipientName: event.name,
      bookingReference: event.bookingId,
      eventTitle: event.classTitle,
    };
  }
}

module.exports = { CoreEventTranslator };
