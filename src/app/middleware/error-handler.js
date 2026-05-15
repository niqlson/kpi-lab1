// Error handler maps error names → HTTP statuses.
// Dispatching by name (rather than `instanceof X`) keeps this middleware
// independent of every module's specific error classes — any module can throw
// an error with `name === 'NotFoundError'` and it lands on 404.

function jsonBodyErrorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  return next(err);
}

const NAME_TO_STATUS = {
  InvalidCredentialsError: 401,
  NotFoundError: 404,
  ConflictError: 409,
  ValidationError: 400,
  DomainError: 400,
};

function domainErrorHandler(err, req, res, next) {
  const status = NAME_TO_STATUS[err.name];
  if (status) return res.status(status).json({ error: err.message });
  return next(err);
}

function fallbackErrorHandler(err, req, res, _next) {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
}

module.exports = { jsonBodyErrorHandler, domainErrorHandler, fallbackErrorHandler };
