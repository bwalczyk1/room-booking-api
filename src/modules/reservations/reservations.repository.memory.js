const DEFAULT_RESERVATIONS = [
  {
    id: 1,
    roomId: 1,
    userId: 2,
    participants: 12,
    startTime: new Date("2026-10-15T08:00:00Z"),
    endTime: new Date("2026-10-15T10:00:00Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-01T09:30:00Z"),
    cancelledAt: null,
    internalNote: "seed: already started"
  },
  {
    id: 2,
    roomId: 1,
    userId: 3,
    participants: 20,
    startTime: new Date("2026-12-01T10:00:00Z"),
    endTime: new Date("2026-12-01T12:00:00Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-20T08:00:00Z"),
    cancelledAt: null,
    internalNote: "seed"
  },
  {
    id: 3,
    roomId: 2,
    userId: 4,
    participants: 15,
    startTime: new Date("2026-12-01T09:00:00Z"),
    endTime: new Date("2026-12-01T11:00:00Z"),
    status: "CANCELLED",
    createdAt: new Date("2026-10-21T10:00:00Z"),
    cancelledAt: new Date("2026-10-25T14:00:00Z"),
    internalNote: "seed: cancelled"
  },
  {
    id: 4,
    roomId: 4,
    userId: 5,
    participants: 18,
    startTime: new Date("2026-12-02T13:00:00Z"),
    endTime: new Date("2026-12-02T15:00:00Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-22T11:00:00Z"),
    cancelledAt: null,
    internalNote: "seed"
  },
  {
    id: 5,
    roomId: 5,
    userId: 6,
    participants: 100,
    startTime: new Date("2026-12-03T10:00:00Z"),
    endTime: new Date("2026-12-03T14:00:00Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-23T12:00:00Z"),
    cancelledAt: null,
    internalNote: "seed"
  }
];

const SORT_FIELDS = { startTime: "startTime", createdAt: "createdAt", participants: "participants" };

function compareBy(field, desc) {
  return (a, b) => {
    const order = Number(a[field]) - Number(b[field]);

    return (desc ? -order : order) || a.id - b.id;
  };
}

function createInMemoryReservationsRepository(repositories, seed = DEFAULT_RESERVATIONS) {
  const reservations = structuredClone(seed);
  let nextReservationId = Math.max(0, ...reservations.map(reservation => reservation.id)) + 1;

  async function withRoom(reservation) {
    const room = await repositories.rooms.findById(reservation.roomId);
    const user = await repositories.users.findById(reservation.userId);

    return {
      ...reservation,
      room: { id: room.id, name: room.name, building: room.building },
      user: { id: user.id, email: user.email }
    };
  }

  return {
    async findById(id) {
      const reservation = reservations.find(reservation => reservation.id === id);

      return reservation ? withRoom(reservation) : null;
    },

    async list({ userId, roomId, buildingId, status, from, to, page, limit, sort }) {
      const all = await Promise.all(reservations.map(withRoom));

      const filtered = all.filter(reservation =>
        (userId === undefined || reservation.userId === userId) &&
        (roomId === undefined || reservation.roomId === roomId) &&
        (buildingId === undefined || reservation.room.building.id === buildingId) &&
        (status === undefined || reservation.status === status) &&
        (to === undefined || reservation.startTime < new Date(to)) &&
        (from === undefined || new Date(from) < reservation.endTime)
      );

      const desc = sort.startsWith("-");
      const sorted = filtered.sort(compareBy(SORT_FIELDS[desc ? sort.slice(1) : sort], desc));

      return { items: sorted.slice((page - 1) * limit, page * limit), total: filtered.length };
    },

    async findByRoomAndStatus(roomId, status) {
      const matching = reservations.filter(reservation => reservation.roomId === roomId && reservation.status === status);

      return Promise.all(matching.map(withRoom));
    },

    // Potrzebne tylko tu: w PostgreSQL usunięcie sali z rezerwacjami blokuje FK
    async countByRoom(roomId) {
      return reservations.filter(reservation => reservation.roomId === roomId).length;
    },

    async create(data) {
      const reservation = { id: nextReservationId++, ...data };

      reservations.push(reservation);

      return withRoom(reservation);
    },

    async update(id, changes) {
      const reservation = reservations.find(reservation => reservation.id === id);

      Object.assign(reservation, changes);

      return withRoom(reservation);
    }
  };
}

module.exports = { createInMemoryReservationsRepository };
