function bookingToResponse(booking, fitnessClass) {
  return {
    id: booking.id,
    userId: booking.userId,
    classId: booking.classId,
    createdAt: booking.createdAt.toISOString(),
    class: fitnessClass
      ? {
          id: fitnessClass.id,
          title: fitnessClass.title,
          instructor: fitnessClass.instructor,
          startsAt: fitnessClass.timeSlot.start.toISOString(),
          endsAt: fitnessClass.timeSlot.end.toISOString(),
        }
      : undefined,
  };
}

module.exports = { bookingToResponse };
