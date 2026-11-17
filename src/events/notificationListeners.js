// Symulacja powiadomienia: właściciel dostaje "maila", gdy jego rezerwację anulował ADMIN
function registerNotificationListeners(eventBus, { runInTransaction }) {
  eventBus.subscribe("reservation.cancelled", async ({ payload }) => {
    if (payload.cancelledBy === payload.userId) return;

    const [owner, canceller] = await runInTransaction(({ users }) => Promise.all([
      users.findById(payload.userId),
      users.findById(payload.cancelledBy)
    ]));

    if (canceller.role !== "ADMIN") return;

    console.log(
      `[notification] to: ${owner.email} - your reservation #${payload.reservationId} ` +
      `(room ${payload.roomId}) was cancelled by an administrator (${canceller.email})`
    );
  });
}

module.exports = { registerNotificationListeners };
