class RegistrationMetric {
  constructor({ id, actorId, registeredAt }) {
    this.id = id;
    this.actorId = actorId;
    this.registeredAt = registeredAt;
    Object.freeze(this);
  }
}

module.exports = { RegistrationMetric };
