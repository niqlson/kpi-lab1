// Core module — public contract.
//
// Other modules (Notifications, Analytics) and the app-level wiring
// MUST go through this file. They MUST NOT reach into core/domain,
// core/application, core/infrastructure directly.
//
// What's exported:
//   - Integration events Core publishes (other modules subscribe to these
//     and translate them via their own ACL).
//   - A `buildCoreModule({ db, eventBus, jwtSecret })` factory that returns
//     the parts of Core other layers need: HTTP routers, the token verifier,
//     and an admin seeder.

const { runMigrations } = require('./infrastructure/db/migrations');
const { SqliteUserRepository } = require('./infrastructure/repositories/sqlite-user-repository');
const { SqliteFitnessClassRepository } = require('./infrastructure/repositories/sqlite-fitness-class-repository');
const { SqliteBookingRepository } = require('./infrastructure/repositories/sqlite-booking-repository');
const { SqliteUserReadRepository } = require('./infrastructure/read-repositories/sqlite-user-read-repository');
const { SqliteFitnessClassReadRepository } = require('./infrastructure/read-repositories/sqlite-fitness-class-read-repository');
const { SqliteBookingReadRepository } = require('./infrastructure/read-repositories/sqlite-booking-read-repository');
const { BcryptPasswordHasher } = require('./infrastructure/security/bcrypt-password-hasher');
const { JwtTokenService } = require('./infrastructure/security/jwt-token-service');

const { UserFactory } = require('./domain/factories/user-factory');
const { FitnessClassFactory } = require('./domain/factories/fitness-class-factory');
const { BookingFactory } = require('./domain/factories/booking-factory');

const { RegisterUserHandler } = require('./application/commands/register-user');
const { LoginUserHandler } = require('./application/commands/login-user');
const { CreateFitnessClassHandler } = require('./application/commands/create-fitness-class');
const { UpdateFitnessClassHandler } = require('./application/commands/update-fitness-class');
const { DeleteFitnessClassHandler } = require('./application/commands/delete-fitness-class');
const { BookClassHandler } = require('./application/commands/book-class');
const { CancelBookingHandler } = require('./application/commands/cancel-booking');

const { GetCurrentUserHandler } = require('./application/queries/get-current-user');
const { ListFitnessClassesHandler } = require('./application/queries/list-fitness-classes');
const { GetFitnessClassHandler } = require('./application/queries/get-fitness-class');
const { ListMyBookingsHandler } = require('./application/queries/list-my-bookings');

const { buildAuthRouter } = require('./presentation/auth-controller');
const { buildFitnessClassesRouter } = require('./presentation/fitness-classes-controller');
const { buildBookingsRouter } = require('./presentation/bookings-controller');

// Integration events — published by Core, consumed by other modules.
const { UserRegistered } = require('./events/user-registered');
const { BookingCreated } = require('./events/booking-created');
const { BookingCancelled } = require('./events/booking-cancelled');

function buildCoreModule({ db, eventBus, jwtSecret }) {
  // 1. Run migrations for Core's own tables.
  runMigrations(db);

  // 2. Wire internal pieces.
  const userRepository = new SqliteUserRepository(db);
  const fitnessClassRepository = new SqliteFitnessClassRepository(db);
  const bookingRepository = new SqliteBookingRepository(db);

  const userReadRepository = new SqliteUserReadRepository(db);
  const fitnessClassReadRepository = new SqliteFitnessClassReadRepository(db);
  const bookingReadRepository = new SqliteBookingReadRepository(db);

  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({ secret: jwtSecret });

  const userFactory = new UserFactory({ userRepository });
  const fitnessClassFactory = new FitnessClassFactory();
  const bookingFactory = new BookingFactory({ fitnessClassRepository, bookingRepository });

  const handlers = {
    registerUser: new RegisterUserHandler({
      userFactory, userRepository, passwordHasher, tokenService, eventBus,
    }),
    loginUser: new LoginUserHandler({ userRepository, passwordHasher, tokenService }),
    createFitnessClass: new CreateFitnessClassHandler({ fitnessClassFactory, fitnessClassRepository }),
    updateFitnessClass: new UpdateFitnessClassHandler({ fitnessClassRepository, bookingRepository }),
    deleteFitnessClass: new DeleteFitnessClassHandler({ fitnessClassRepository }),
    bookClass: new BookClassHandler({
      bookingFactory, bookingRepository, userRepository, fitnessClassRepository, eventBus,
    }),
    cancelBooking: new CancelBookingHandler({
      bookingRepository, fitnessClassRepository, userRepository, eventBus,
    }),
    getCurrentUser: new GetCurrentUserHandler({ userReadRepository }),
    listFitnessClasses: new ListFitnessClassesHandler({ fitnessClassReadRepository }),
    getFitnessClass: new GetFitnessClassHandler({ fitnessClassReadRepository }),
    listMyBookings: new ListMyBookingsHandler({ bookingReadRepository }),
  };

  // 3. Expose only what other layers should see.
  return {
    routers: {
      auth: buildAuthRouter({ handlers, tokenService }),
      classes: buildFitnessClassesRouter({ handlers, tokenService }),
      bookings: buildBookingsRouter({ handlers, tokenService }),
    },
    tokenService,
    seedAdmin: async ({ email, password }) => {
      if (!email || !password) return;
      const existing = await userRepository.findByEmail(email);
      if (existing) return;
      const passwordHash = await passwordHasher.hash(password);
      const user = await userFactory.create({ email, name: 'Admin', passwordHash, role: 'admin' });
      await userRepository.save(user);
    },
  };
}

module.exports = {
  buildCoreModule,
  // Integration events are part of the public contract.
  events: { UserRegistered, BookingCreated, BookingCancelled },
};
