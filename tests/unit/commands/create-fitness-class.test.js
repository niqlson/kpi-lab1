const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CreateFitnessClassCommand,
  CreateFitnessClassHandler,
} = require('../../../src/application/commands/create-fitness-class');
const {
  UpdateFitnessClassCommand,
  UpdateFitnessClassHandler,
} = require('../../../src/application/commands/update-fitness-class');
const {
  DeleteFitnessClassCommand,
  DeleteFitnessClassHandler,
} = require('../../../src/application/commands/delete-fitness-class');
const { FitnessClassFactory } = require('../../../src/domain/factories/fitness-class-factory');
const {
  InMemoryFitnessClassRepository,
  InMemoryBookingRepository,
} = require('../../helpers/in-memory-repositories');
const { ValidationError, NotFoundError, ConflictError } = require('../../../src/domain/errors');
const { futureIso } = require('../../helpers/fakes');

function build() {
  const fitnessClassRepository = new InMemoryFitnessClassRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const fitnessClassFactory = new FitnessClassFactory();
  return {
    fitnessClassRepository,
    bookingRepository,
    create: new CreateFitnessClassHandler({ fitnessClassFactory, fitnessClassRepository }),
    update: new UpdateFitnessClassHandler({ fitnessClassRepository, bookingRepository }),
    del:    new DeleteFitnessClassHandler({ fitnessClassRepository }),
  };
}

test('CreateFitnessClass returns {id} and persists', async () => {
  const { create, fitnessClassRepository } = build();
  const result = await create.handle(new CreateFitnessClassCommand({
    title: 'Yoga', instructor: 'Anna',
    startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
  }));
  assert.ok(result.id);
  assert.ok(await fitnessClassRepository.findById(result.id));
});

test('CreateFitnessClass rejects past startsAt with ValidationError', async () => {
  const { create } = build();
  await assert.rejects(
    create.handle(new CreateFitnessClassCommand({
      title: 'Yoga', instructor: 'Anna',
      startsAt: '2000-01-01T00:00:00Z', endsAt: '2000-01-01T01:00:00Z', capacity: 10,
    })),
    ValidationError
  );
});

test('UpdateFitnessClass throws NotFoundError for missing class', async () => {
  const { update } = build();
  await assert.rejects(
    update.handle(new UpdateFitnessClassCommand({ classId: 'nope', title: 'X' })),
    NotFoundError
  );
});

test('UpdateFitnessClass updates title via the rename mutator', async () => {
  const { create, update, fitnessClassRepository } = build();
  const { id } = await create.handle(new CreateFitnessClassCommand({
    title: 'Yoga', instructor: 'Anna',
    startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
  }));
  await update.handle(new UpdateFitnessClassCommand({ classId: id, title: 'Power Yoga' }));
  const cls = await fitnessClassRepository.findById(id);
  assert.equal(cls.title, 'Power Yoga');
});

test('UpdateFitnessClass refuses to lower capacity below current bookings', async () => {
  const { create, update, bookingRepository } = build();
  const { id } = await create.handle(new CreateFitnessClassCommand({
    title: 'Y', instructor: 'A',
    startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
  }));
  // Manually fake 3 existing bookings
  for (let i = 0; i < 3; i += 1) {
    await bookingRepository.save({ id: `b-${i}`, userId: `u-${i}`, classId: id, createdAt: new Date() });
  }
  await assert.rejects(
    update.handle(new UpdateFitnessClassCommand({ classId: id, capacity: 2 })),
    ConflictError
  );
});

test('DeleteFitnessClass returns nothing on success', async () => {
  const { create, del, fitnessClassRepository } = build();
  const { id } = await create.handle(new CreateFitnessClassCommand({
    title: 'Y', instructor: 'A',
    startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
  }));
  const result = await del.handle(new DeleteFitnessClassCommand({ classId: id }));
  assert.equal(result, undefined);
  assert.equal(await fitnessClassRepository.findById(id), null);
});

test('DeleteFitnessClass throws NotFoundError for missing class', async () => {
  const { del } = build();
  await assert.rejects(
    del.handle(new DeleteFitnessClassCommand({ classId: 'nope' })),
    NotFoundError
  );
});
