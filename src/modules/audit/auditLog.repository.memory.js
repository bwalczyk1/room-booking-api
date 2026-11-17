function createInMemoryAuditLogRepository(repositories, seed = []) {
  const entries = structuredClone(seed);
  let nextEntryId = Math.max(0, ...entries.map(entry => entry.id)) + 1;

  return {
    async create({ eventType, payload, createdAt }) {
      const entry = { id: nextEntryId++, eventType, payload: structuredClone(payload), createdAt };

      entries.push(entry);

      return entry;
    },

    async list({ eventType, page, limit }) {
      const filtered = entries
        .filter(entry => eventType === undefined || entry.eventType === eventType)
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);

      return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
    }
  };
}

module.exports = { createInMemoryAuditLogRepository };
