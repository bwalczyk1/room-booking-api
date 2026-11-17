// Każdy event rezerwacji trafia do tabeli audit_log
function registerAuditListeners(eventBus, { runInTransaction }) {
  const save = event => runInTransaction(({ auditLog }) => auditLog.create({
    eventType: event.name,
    payload: event.payload,
    createdAt: new Date(event.occurredAt)
  }));

  eventBus.subscribe("reservation.created", save);
  eventBus.subscribe("reservation.cancelled", save);
}

module.exports = { registerAuditListeners };
