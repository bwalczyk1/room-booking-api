function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

// Jawna lista pól - internalNote i inne pola wewnętrzne nie trafiają do API
function toReservationResponse(reservation) {
  return {
    id: reservation.id,
    room: {
      id: reservation.room.id,
      name: reservation.room.name,
      building: { id: reservation.room.building.id, name: reservation.room.building.name }
    },
    user: { id: reservation.user.id, email: reservation.user.email },
    participants: reservation.participants,
    startTime: toIsoOrNull(reservation.startTime),
    endTime: toIsoOrNull(reservation.endTime),
    status: reservation.status,
    createdAt: toIsoOrNull(reservation.createdAt),
    cancelledAt: toIsoOrNull(reservation.cancelledAt)
  };
}

module.exports = { toReservationResponse };
