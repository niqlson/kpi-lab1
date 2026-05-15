const test = require('node:test');
const assert = require('node:assert/strict');
const { BookingFactory } = require('../../../../src/modules/core/domain/factories/booking-factory');
const { FitnessClassFactory } = require('../../../../src/modules/core/domain/factories/fitness-class-factory');
const {
  InMemoryFitnessClassRepository,
  InMemoryBookingRepository,
} = require('../../../helpers/in-memory-repositories');
const { NotFoundError, ConflictError } = require('../../../../src/modules/core/domain/errors');
const { futureIso } = require('../../../helpers/fakes');

async function setup() {
  const classRepo = new InMemoryFitnessClassRepository();
  const bookingRepo = new InMemoryBookingRepository();
  const classFactory = new FitnessClassFactory();
  const cls = classFactory.create({
    title: 'Yoga',
    instructor: 'Anna',
    startsAt: futureIso(60),
    endsAt: futureIso(120),
    capacity: 2,
  });
  await classRepo.save(cls);
  const factory = new BookingFactory({
    fitnessClassRepository: classRepo,
    bookingRepository: bookingRepo,
  });
  return { factory, cls, bookingRepo };
}

test('BookingFactory.create produces a booking on the happy path', async () => {
  const { factory, cls } = await setup();
  const b = await factory.create({ userId: 'u-1', classId: cls.id });
  assert.equal(b.userId, 'u-1');
  assert.equal(b.classId, cls.id);
});

test('BookingFactory throws NotFoundError for unknown class', async () => {
  const { factory } = await setup();
  await assert.rejects(
    factory.create({ userId: 'u-1', classId: 'nope' }),
    NotFoundError
  );
});

test('BookingFactory throws ConflictError on duplicate booking', async () => {
  const { factory, cls, bookingRepo } = await setup();
  const b = await factory.create({ userId: 'u-1', classId: cls.id });
  await bookingRepo.save(b);
  await assert.rejects(
    factory.create({ userId: 'u-1', classId: cls.id }),
    ConflictError
  );
});

test('BookingFactory throws ConflictError when class is full', async () => {
  const { factory, cls, bookingRepo } = await setup(); // capacity=2
  await bookingRepo.save(await factory.create({ userId: 'u-1', classId: cls.id }));
  await bookingRepo.save(await factory.create({ userId: 'u-2', classId: cls.id }));
  await assert.rejects(
    factory.create({ userId: 'u-3', classId: cls.id }),
    ConflictError
  );
});
