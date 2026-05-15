class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class ValidationError extends DomainError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends DomainError {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends DomainError {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = { DomainError, ValidationError, NotFoundError, ConflictError };
