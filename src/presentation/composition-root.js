// Composition root — wires all four layers, including both write and read sides.

const { SqliteUserRepository } = require('../infrastructure/repositories/sqlite-user-repository');
const { SqliteFitnessClassRepository } = require('../infrastructure/repositories/sqlite-fitness-class-repository');
const { SqliteBookingRepository } = require('../infrastructure/repositories/sqlite-booking-repository');
const { SqliteUserReadRepository } = require('../infrastructure/read-repositories/sqlite-user-read-repository');
const { SqliteFitnessClassReadRepository } = require('../infrastructure/read-repositories/sqlite-fitness-class-read-repository');
const { SqliteBookingReadRepository } = require('../infrastructure/read-repositories/sqlite-booking-read-repository');
const { BcryptPasswordHasher } = require('../infrastructure/security/bcrypt-password-hasher');
const { JwtTokenService } = require('../infrastructure/security/jwt-token-service');

const { UserFactory } = require('../domain/factories/user-factory');
const { FitnessClassFactory } = require('../domain/factories/fitness-class-factory');
const { BookingFactory } = require('../domain/factories/booking-factory');

// Commands
const { RegisterUserHandler } = require('../application/commands/register-user');
const { LoginUserHandler } = require('../application/commands/login-user');
const { CreateFitnessClassHandler } = require('../application/commands/create-fitness-class');
const { UpdateFitnessClassHandler } = require('../application/commands/update-fitness-class');
const { DeleteFitnessClassHandler } = require('../application/commands/delete-fitness-class');
const { BookClassHandler } = require('../application/commands/book-class');
const { CancelBookingHandler } = require('../application/commands/cancel-booking');

// Queries
const { GetCurrentUserHandler } = require('../application/queries/get-current-user');
const { ListFitnessClassesHandler } = require('../application/queries/list-fitness-classes');
const { GetFitnessClassHandler } = require('../application/queries/get-fitness-class');
const { ListMyBookingsHandler } = require('../application/queries/list-my-bookings');

function buildContainer({ db, jwtSecret }) {
  // Write side
  const userRepository = new SqliteUserRepository(db);
  const fitnessClassRepository = new SqliteFitnessClassRepository(db);
  const bookingRepository = new SqliteBookingRepository(db);

  // Read side — separate from write side per CQS
  const userReadRepository = new SqliteUserReadRepository(db);
  const fitnessClassReadRepository = new SqliteFitnessClassReadRepository(db);
  const bookingReadRepository = new SqliteBookingReadRepository(db);

  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({ secret: jwtSecret });

  const userFactory = new UserFactory({ userRepository });
  const fitnessClassFactory = new FitnessClassFactory();
  const bookingFactory = new BookingFactory({ fitnessClassRepository, bookingRepository });

  const handlers = {
    // Commands
    registerUser: new RegisterUserHandler({ userFactory, userRepository, passwordHasher, tokenService }),
    loginUser: new LoginUserHandler({ userRepository, passwordHasher, tokenService }),
    createFitnessClass: new CreateFitnessClassHandler({ fitnessClassFactory, fitnessClassRepository }),
    updateFitnessClass: new UpdateFitnessClassHandler({ fitnessClassRepository, bookingRepository }),
    deleteFitnessClass: new DeleteFitnessClassHandler({ fitnessClassRepository }),
    bookClass: new BookClassHandler({ bookingFactory, bookingRepository }),
    cancelBooking: new CancelBookingHandler({ bookingRepository, fitnessClassRepository }),
    // Queries
    getCurrentUser: new GetCurrentUserHandler({ userReadRepository }),
    listFitnessClasses: new ListFitnessClassesHandler({ fitnessClassReadRepository }),
    getFitnessClass: new GetFitnessClassHandler({ fitnessClassReadRepository }),
    listMyBookings: new ListMyBookingsHandler({ bookingReadRepository }),
  };

  return {
    repositories: { userRepository, fitnessClassRepository, bookingRepository },
    readRepositories: { userReadRepository, fitnessClassReadRepository, bookingReadRepository },
    services: { passwordHasher, tokenService },
    factories: { userFactory, fitnessClassFactory, bookingFactory },
    handlers,
  };
}

async function seedAdmin({ container, email, password }) {
  if (!email || !password) return;
  const existing = await container.repositories.userRepository.findByEmail(email);
  if (existing) return;
  const passwordHash = await container.services.passwordHasher.hash(password);
  const user = await container.factories.userFactory.create({
    email,
    name: 'Admin',
    passwordHash,
    role: 'admin',
  });
  await container.repositories.userRepository.save(user);
}

module.exports = { buildContainer, seedAdmin };
