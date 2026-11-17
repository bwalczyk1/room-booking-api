const AUDIT_LOG_COLUMNS = ["id", "event_type", "payload", "created_at"];

function toAuditLogEntry(row) {
  return { id: Number(row.id), eventType: row.event_type, payload: row.payload, createdAt: row.created_at };
}

function createKnexAuditLogRepository(db) {
  return {
    async create({ eventType, payload, createdAt }) {
      const [row] = await db("audit_log")
        .insert({ event_type: eventType, payload, created_at: createdAt })
        .returning(AUDIT_LOG_COLUMNS);

      return toAuditLogEntry(row);
    },

    // Od najnowszych; przy tym samym czasie decyduje id, więc kolejność jest stała między stronami
    async list({ eventType, page, limit }) {
      const filtered = db("audit_log").modify(qb => {
        if (eventType !== undefined) qb.where("event_type", eventType);
      });

      const [rows, { count }] = await Promise.all([
        filtered.clone()
          .select(AUDIT_LOG_COLUMNS)
          .orderBy("created_at", "desc")
          .orderBy("id", "desc")
          .limit(limit)
          .offset((page - 1) * limit),
        filtered.clone().count({ count: "id" }).first()
      ]);

      return { items: rows.map(toAuditLogEntry), total: Number(count) };
    }
  };
}

module.exports = { createKnexAuditLogRepository };
