function fitnessClassToResponse(cls) {
  return {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    instructor: cls.instructor,
    startsAt: cls.timeSlot.start.toISOString(),
    endsAt: cls.timeSlot.end.toISOString(),
    capacity: cls.capacity,
    createdAt: cls.createdAt.toISOString(),
  };
}

module.exports = { fitnessClassToResponse };
