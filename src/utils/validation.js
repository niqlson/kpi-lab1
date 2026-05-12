const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === new Date(d.toISOString()).toISOString();
}

function validateClassInput(input, { partial = false } = {}) {
  const errors = [];
  const { title, instructor, startsAt, endsAt, capacity } = input;

  if (!partial || title !== undefined) {
    if (!isNonEmptyString(title)) errors.push('title must be a non-empty string');
  }
  if (!partial || instructor !== undefined) {
    if (!isNonEmptyString(instructor)) errors.push('instructor must be a non-empty string');
  }
  if (!partial || capacity !== undefined) {
    if (!isPositiveInt(capacity)) errors.push('capacity must be a positive integer');
  }
  if (!partial || startsAt !== undefined) {
    if (!isValidIsoDate(startsAt)) errors.push('startsAt must be a valid ISO date');
    else if (new Date(startsAt) <= new Date()) errors.push('startsAt must be in the future');
  }
  if (!partial || endsAt !== undefined) {
    if (!isValidIsoDate(endsAt)) errors.push('endsAt must be a valid ISO date');
  }
  if (startsAt !== undefined && endsAt !== undefined &&
      isValidIsoDate(startsAt) && isValidIsoDate(endsAt)) {
    if (new Date(endsAt) <= new Date(startsAt)) {
      errors.push('endsAt must be strictly after startsAt');
    }
  }

  return errors;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  isPositiveInt,
  isValidIsoDate,
  validateClassInput,
};
