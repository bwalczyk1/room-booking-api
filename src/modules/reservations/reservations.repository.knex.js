// Whitelist sortowania: wartość z API -> kolumna w bazie (nazwa kolumny nigdy nie pochodzi od klienta)
const SORT_COLUMNS = {
  startTime: "r.start_time",
  createdAt: "r.created_at",
  participants: "r.participants"
};

const COLUMN_NAMES = {
  status: "status",
  cancelledAt: "cancelled_at"
};

function toReservation(row) {
  if (!row) return null;

  return {
    id: row.id,
    roomId: row.room_id,
    room: {
      id: row.room_id,
      name: row.room_name,
      building: { id: row.building_id, name: row.building_name }
    },
    userId: row.user_id,
    user: { id: row.user_id, email: row.user_email },
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    internalNote: row.internal_note
  };
}

// Rezerwacja razem z salą, budynkiem i właścicielem w jednym zapytaniu (trzy JOIN-y) - bez N+1
function reservationsWithRoom(db) {
  return db("reservations as r")
    .join("rooms as rm", "rm.id", "r.room_id")
    .join("buildings as b", "b.id", "rm.building_id")
    .join("users as u", "u.id", "r.user_id");
}

const RESERVATION_COLUMNS = [
  "r.*",
  "rm.name as room_name",
  "b.id as building_id",
  "b.name as building_name",
  "u.email as user_email"
];

function createKnexReservationsRepository(db) {
  return {
    async findById(id) {
      const row = await reservationsWithRoom(db).select(RESERVATION_COLUMNS).where("r.id", id).first();

      return toReservation(row);
    },

    async list({ userId, roomId, buildingId, status, from, to, page, limit, sort }) {
      const filtered = reservationsWithRoom(db).modify(qb => {
        if (userId !== undefined) qb.where("r.user_id", userId);
        if (roomId !== undefined) qb.where("r.room_id", roomId);
        if (buildingId !== undefined) qb.where("rm.building_id", buildingId);
        if (status !== undefined) qb.where("r.status", status);

        // Rezerwacja [start, end) nakłada się na [from, to), gdy start < to i from < end
        if (to !== undefined) qb.where("r.start_time", "<", new Date(to));
        if (from !== undefined) qb.where("r.end_time", ">", new Date(from));
      });

      const desc = sort.startsWith("-");
      const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

      const [rows, { count }] = await Promise.all([
        filtered.clone()
          .select(RESERVATION_COLUMNS)
          .orderBy(column, desc ? "desc" : "asc")
          .orderBy("r.id", "asc")
          .limit(limit)
          .offset((page - 1) * limit),
        filtered.clone().count({ count: "r.id" }).first()
      ]);

      return { items: rows.map(toReservation), total: Number(count) };
    },

    async findByRoomAndStatus(roomId, status) {
      const rows = await reservationsWithRoom(db)
        .select(RESERVATION_COLUMNS)
        .where({ "r.room_id": roomId, "r.status": status });

      return rows.map(toReservation);
    },

    async create(data) {
      const [row] = await db("reservations")
        .insert({
          room_id: data.roomId,
          user_id: data.userId,
          participants: data.participants,
          start_time: data.startTime,
          end_time: data.endTime,
          status: data.status,
          created_at: data.createdAt,
          cancelled_at: data.cancelledAt,
          internal_note: data.internalNote
        })
        .returning("id");

      return this.findById(row.id);
    },

    async update(id, changes) {
      const columns = Object.fromEntries(
        Object.entries(changes).map(([field, value]) => [COLUMN_NAMES[field], value])
      );

      await db("reservations").where({ id }).update(columns);

      return this.findById(id);
    }
  };
}

module.exports = { createKnexReservationsRepository, SORT_COLUMNS };
