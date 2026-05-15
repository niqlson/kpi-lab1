const test = require('node:test');
const assert = require('node:assert/strict');
const { BookClass } = require('../../../src/application/use-cases/book-class');
const { CancelBooking } = require('../../../src/application/use-cases/cancel-booking');
const { ListMyBookings } = require('../../../src/application/use-cases/list-my-bookings');
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
    book: new BookClass({ bookingFactory, bookingRepository }),
    cancel: new CancelBooking({ bookingRepository, fitnessClassRepository }),
    list: new ListMyBookings({ bookingRepository, fitnessClassRepository }),
  };
}

test('BookClass persists a booking', async () => {
  const { book, cls, bookingRepository } = await setup();
  const b = await book.execute({ userId: 'u-1', classId: cls.id });
  assert.equal(b.userId, 'u-1');
  const stored = await bookingRepository.findById(b.id);
  assert.ok(stored);
});

test('BookClass throws ConflictError when class is full', async () => {
  const { book, cls } = await setup();  // capacity=1
  await book.execute({ userId: 'u-1', classId: cls.id });
  await assert.rejects(
    book.execute({ userId: 'u-2', classId: cls.id }),
    ConflictError
  );
});

test('CancelBooking removes own booking', async () => {
  const { book, cancel, cls, bookingRepository } = await setup();
  const b = await book.execute({ userId: 'u-1', classId: cls.id });
  await cancel.execute({ bookingId: b.id, userId: 'u-1' });
  assert.equal(await bookingRepository.findById(b.id), null);
});

test('CancelBooking throws NotFoundError when caller is not the owner', async () => {
  const { book, cancel, cls } = await setup();
  const b = await book.execute({ userId: 'u-1', classId: cls.id });
  await assert.rejects(
    cancel.execute({ bookingId: b.id, userId: 'u-2' }),
    NotFoundError
  );
});

test('ListMyBookings returns enriched bookings only for the caller', async () => {
  const { list, book, cls } = await setup();
  await book.execute({ userId: 'u-1', classId: cls.id });
  const items = await list.execute({ userId: 'u-1' });
  assert.equal(items.length, 1);
  assert.equal(items[0].fitnessClass.title, 'Yoga');
  const empty = await list.execute({ userId: 'u-2' });
  assert.equal(empty.length, 0);
});
