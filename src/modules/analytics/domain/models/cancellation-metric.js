class CancellationMetric {
  constructor({ id, actorId, resourceId, resourceTitle, recordedAt }) {
    this.id = id;
    this.actorId = actorId;
    this.resourceId = resourceId;
    this.resourceTitle = resourceTitle;
    this.recordedAt = recordedAt;
    Object.freeze(this);
  }
}

module.exports = { CancellationMetric };
