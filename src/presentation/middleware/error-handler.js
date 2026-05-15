const {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
} = require('../../domain/errors');
const { InvalidCredentialsError } = require('../../application/commands/login-user');

function jsonBodyErrorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  return next(err);
}

function domainErrorHandler(err, req, res, next) {
  if (err instanceof InvalidCredentialsError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof DomainError) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
}

function fallbackErrorHandler(err, req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
}

module.exports = { jsonBodyErrorHandler, domainErrorHandler, fallbackErrorHandler };
