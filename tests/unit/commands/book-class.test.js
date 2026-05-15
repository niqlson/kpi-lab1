const test = require('node:test');
const assert = require('node:assert/strict');
const { BookClassCommand, BookClassHandler } = require('../../../src/application/commands/book-class');
const { CancelBookingCommand, CancelBookingHandler } = require('../../../src/application/commands/cancel-booking');
const { BookingFactory } = require('../../../src/domain/factories/booking-factory');
const { FitnessClassFactory } = require('../../../src/domain/factories/fitness-class-factory');
const {
  InMemoryFitnessClassRepository,
  InMemoryBookingRepository,
} = require('../../helpers/in-memory-repositories');
const { ConflictError, NotFoundError } = require('../../../src/domain/errors');
const { futureIso } = require('../../helpers/fakes');

async function setup() {
  const fitnessClassRepository = new InMemoryFitnessClassRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const bookingFactory = new BookingFactory({ fitnessClassRepository, bookingRepository });
  const classFactory = new FitnessClassFactory();
  const cls = classFactory.create({
    title: 'Yoga', instructor: 'Anna',
    startsAt: futureIso(60), endsAt: futureIso(120), capacity: 1,
  });
  await fitnessClassRepository.save(cls);
  return {
    cls,
    bookingRepository,
    book: new BookClassHandler({ bookingFactory, bookingRepository }),
    cancel: new CancelBookingHandler({ bookingRepository, fitnessClassRepository }),
  };
}

test('BookClass returns {id} and persists the booking', async () => {
  const { book, cls, bookingRepository } = await setup();
  const result = await book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id }));
  assert.ok(result.id);
  assert.ok(await bookingRepository.findById(result.id));
});

test('BookClass throws ConflictError when class is full', async () => {
  const { book, cls } = await setup();  // capacity=1
  await book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id }));
  await assert.rejects(
    book.handle(new BookClassCommand({ userId: 'u-2', classId: cls.id })),
    ConflictError
  );
});

test('BookClass throws NotFoundError for unknown class', async () => {
  const { book } = await setup();
  await assert.rejects(
    book.handle(new BookClassCommand({ userId: 'u-1', classId: 'nope' })),
    NotFoundError
  );
});

test('BookClass throws ConflictError on duplicate booking', async () => {
  const { book, cls } = await setup();
  await book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id }));
  await assert.rejects(
    book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id })),
    ConflictError
  );
});

test('CancelBooking removes own booking', async () => {
  const { book, cancel, cls, bookingRepository } = await setup();
  const created = await book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id }));
  await cancel.handle(new CancelBookingCommand({ bookingId: created.id, userId: 'u-1' }));
  assert.equal(await bookingRepository.findById(created.id), null);
});

test('CancelBooking throws NotFoundError when caller is not the owner', async () => {
  const { book, cancel, cls } = await setup();
  const created = await book.handle(new BookClassCommand({ userId: 'u-1', classId: cls.id }));
  await assert.rejects(
    cancel.handle(new CancelBookingCommand({ bookingId: created.id, userId: 'u-2' })),
    NotFoundError
  );
});
