// Analytics-internal model. Notice the renamed field names — these are
// Analytics's own terms, not Core's.
//   actorId       ← Core's userId
//   resourceId    ← Core's classId
//   resourceTitle ← Core's classTitle
//   recordedAt    ← Core's occurredAt
//
// If Core renames things tomorrow, the ACL absorbs the change. The rest of
// Analytics still talks about "actors" and "resources".

class BookingMetric {
  constructor({ id, actorId, resourceId, resourceTitle, recordedAt }) {
    this.id = id;
    this.actorId = actorId;
    this.resourceId = resourceId;
    this.resourceTitle = resourceTitle;
    this.recordedAt = recordedAt;
    Object.freeze(this);
  }
}

module.exports = { BookingMetric };
