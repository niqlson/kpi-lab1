const { FitnessClass } = require('../../domain/entities/fitness-class');
const { TimeSlot } = require('../../domain/value-objects/time-slot');

class FitnessClassMapper {
  static toDomain(row) {
    return new FitnessClass({
      id: row.id,
      title: row.title,
      description: row.description,
      instructor: row.instructor,
      timeSlot: new TimeSlot(new Date(row.starts_at), new Date(row.ends_at)),
      capacity: row.capacity,
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(fitnessClass) {
    return {
      id: fitnessClass.id,
      title: fitnessClass.title,
      description: fitnessClass.description,
      instructor: fitnessClass.instructor,
      starts_at: fitnessClass.timeSlot.start.toISOString(),
      ends_at: fitnessClass.timeSlot.end.toISOString(),
      capacity: fitnessClass.capacity,
      created_at: fitnessClass.createdAt.toISOString(),
    };
  }
}

module.exports = { FitnessClassMapper };
