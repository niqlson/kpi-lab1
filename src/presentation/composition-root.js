// Composition root — the only place that wires all four layers together.
// Anywhere else in the codebase, layers know each other through interfaces.

const { SqliteUserRepository } = require('../infrastructure/repositories/sqlite-user-repository');
const { SqliteFitnessClassRepository } = require('../infrastructure/repositories/sqlite-fitness-class-repository');
const { SqliteBookingRepository } = require('../infrastructure/repositories/sqlite-booking-repository');
const { BcryptPasswordHasher } = require('../infrastructure/security/bcrypt-password-hasher');
const { JwtTokenService } = require('../infrastructure/security/jwt-token-service');

const { UserFactory } = require('../domain/factories/user-factory');
const { FitnessClassFactory } = require('../domain/factories/fitness-class-factory');
const { BookingFactory } = require('../domain/factories/booking-factory');

const { RegisterUser } = require('../application/use-cases/register-user');
const { LoginUser } = require('../application/use-cases/login-user');
const { GetCurrentUser } = require('../application/use-cases/get-current-user');
const { ListFitnessClasses } = require('../application/use-cases/list-fitness-classes');
const { GetFitnessClass } = require('../application/use-cases/get-fitness-class');
const { CreateFitnessClass } = require('../application/use-cases/create-fitness-class');
const { UpdateFitnessClass } = require('../application/use-cases/update-fitness-class');
const { DeleteFitnessClass } = require('../application/use-cases/delete-fitness-class');
const { BookClass } = require('../application/use-cases/book-class');
const { ListMyBookings } = require('../application/use-cases/list-my-bookings');
const { CancelBooking } = require('../application/use-cases/cancel-booking');

function buildContainer({ db, jwtSecret }) {
  const userRepository = new SqliteUserRepository(db);
  const fitnessClassRepository = new SqliteFitnessClassRepository(db);
  const bookingRepository = new SqliteBookingRepository(db);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({ secret: jwtSecret });

  const userFactory = new UserFactory({ userRepository });
  const fitnessClassFactory = new FitnessClassFactory();
  const bookingFactory = new BookingFactory({ fitnessClassRepository, bookingRepository });

  const useCases = {
    registerUser: new RegisterUser({ userFactory, userRepository, passwordHasher, tokenService }),
    loginUser: new LoginUser({ userRepository, passwordHasher, tokenService }),
    getCurrentUser: new GetCurrentUser({ userRepository }),
    listFitnessClasses: new ListFitnessClasses({ fitnessClassRepository }),
    getFitnessClass: new GetFitnessClass({ fitnessClassRepository }),
    createFitnessClass: new CreateFitnessClass({ fitnessClassFactory, fitnessClassRepository }),
    updateFitnessClass: new UpdateFitnessClass({ fitnessClassRepository, bookingRepository }),
    deleteFitnessClass: new DeleteFitnessClass({ fitnessClassRepository }),
    bookClass: new BookClass({ bookingFactory, bookingRepository }),
    listMyBookings: new ListMyBookings({ bookingRepository, fitnessClassRepository }),
    cancelBooking: new CancelBooking({ bookingRepository, fitnessClassRepository }),
  };

  return {
    repositories: { userRepository, fitnessClassRepository, bookingRepository },
    services: { passwordHasher, tokenService },
    factories: { userFactory, fitnessClassFactory, bookingFactory },
    useCases,
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
