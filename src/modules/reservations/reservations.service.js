const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: []
};

// Przedziały półotwarte [start, end): A i B nakładają się, gdy A.start < B.end i B.start < A.end
function overlaps(a, b) {
  return a.startTime.getTime() < b.endTime.getTime() && b.startTime.getTime() < a.endTime.getTime();
}

// Ownership: właściciel albo ADMIN. Decyzja zależy od danych (czyja jest rezerwacja), więc zapada w service
function canAccess(reservation, currentUser) {
  return currentUser.role === "ADMIN" || reservation.userId === currentUser.id;
}

function createReservationsService({ runInTransaction, now = () => new Date() }) {
  function checkTimeRange(startTime, endTime) {
    const details = [];
    const duration = endTime.getTime() - startTime.getTime();

    if (duration <= 0) {
      details.push({ location: "body", field: "endTime", message: "endTime must be later than startTime" });
    } else if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      details.push({ location: "body", field: "endTime", message: "Reservation must last between 15 minutes and 8 hours" });
    }

    if (startTime.getTime() < now().getTime()) {
      details.push({ location: "body", field: "startTime", message: "startTime cannot be in the past" });
    }

    return details;
  }

  // currentUser = { id, role } z tokenu - service nie zna Expressa ani req
  async function createReservation(input, currentUser) {
    return runInTransaction(async ({ rooms: roomsRepository, reservations: reservationsRepository }) => {
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);
      const details = checkTimeRange(startTime, endTime);

      if (details.length > 0) throw new ValidationError(details);

      // Blokada wiersza sali do końca transakcji: równoległe rezerwacje tej samej sali czekają tutaj,
      // aż poprzednia zrobi COMMIT, i dopiero wtedy sprawdzają kolizje (już widząc jej rezerwację)
      await roomsRepository.lockById(input.roomId);

      const room = await roomsRepository.findById(input.roomId);

      if (!room) throw new NotFoundError("Room");

      if (input.participants > room.capacity) {
        throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
      }

      const activeReservations = await reservationsRepository.findByRoomAndStatus(room.id, "CONFIRMED");

      if (activeReservations.some(reservation => overlaps(reservation, { startTime, endTime }))) {
        throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
      }

      return reservationsRepository.create({
        ...input,
        userId: currentUser.id,
        startTime,
        endTime,
        status: "CONFIRMED",
        createdAt: now(),
        cancelledAt: null,
        internalNote: "created via API v2"
      });
    });
  }

  async function cancelReservation(id, currentUser) {
    return runInTransaction(async ({ reservations: reservationsRepository }) => {
      const reservation = await reservationsRepository.findById(id);

      // Cudza rezerwacja wygląda dla USER-a tak samo jak nieistniejąca - nie zdradzamy, że istnieje
      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");

      // Idempotencja: ponowne anulowanie zwraca rezerwację bez zmian (cancelledAt zostaje)
      if (reservation.status === "CANCELLED") return reservation;

      if (!ALLOWED_TRANSITIONS[reservation.status].includes("CANCELLED")) {
        throw new ConflictError(
          `Cannot change status from ${reservation.status} to CANCELLED`,
          "INVALID_STATUS_TRANSITION"
        );
      }

      if (reservation.startTime.getTime() <= now().getTime()) {
        throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
      }

      return reservationsRepository.update(id, { status: "CANCELLED", cancelledAt: now() });
    });
  }

  async function getReservation(id, currentUser) {
    return runInTransaction(async ({ reservations: reservationsRepository }) => {
      const reservation = await reservationsRepository.findById(id);

      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");

      return reservation;
    });
  }

  async function listReservations(query, currentUser) {
    const isAdmin = currentUser.role === "ADMIN";

    if (!isAdmin && query.userId !== undefined) throw new ForbiddenError("Only ADMIN can filter by userId");

    // USER widzi tylko swoje rezerwacje - filtr dokłada backend, niezależnie od parametrów query
    const filters = isAdmin ? query : { ...query, userId: currentUser.id };

    return runInTransaction(async ({ reservations: reservationsRepository }) => {
      const { items, total } = await reservationsRepository.list(filters);

      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }
      };
    });
  }

  return { createReservation, cancelReservation, getReservation, listReservations };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
