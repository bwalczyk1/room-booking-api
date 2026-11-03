function toRoom(row) {
  if (!row) return null;

  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    capacity: row.capacity,
    createdAt: row.created_at,
    building: { id: row.building_id, name: row.building_name }
  };
}

// Sala zawsze razem z budynkiem - jeden JOIN zamiast osobnego zapytania na każdą salę
function roomsWithBuilding(db) {
  return db("rooms as rm")
    .join("buildings as b", "b.id", "rm.building_id")
    .select("rm.*", "b.name as building_name");
}

function createKnexRoomsRepository(db) {
  return {
    async findAll() {
      const rows = await roomsWithBuilding(db).orderBy("rm.id", "asc");

      return rows.map(toRoom);
    },

    async findById(id) {
      return toRoom(await roomsWithBuilding(db).where("rm.id", id).first());
    },

    async findByBuilding(buildingId) {
      const rows = await roomsWithBuilding(db).where("rm.building_id", buildingId).orderBy("rm.id", "asc");

      return rows.map(toRoom);
    },

    async countByBuilding(buildingId) {
      const { count } = await db("rooms").where({ building_id: buildingId }).count({ count: "*" }).first();

      return Number(count);
    },

    async create({ buildingId, name, capacity }) {
      const [row] = await db("rooms").insert({ building_id: buildingId, name, capacity }).returning("id");

      return this.findById(row.id);
    },

    async update(id, changes) {
      await db("rooms").where({ id }).update(changes);

      return this.findById(id);
    },

    async delete(id) {
      await db("rooms").where({ id }).delete();
    },

    // Blokada wiersza sali do końca transakcji (SELECT ... FOR UPDATE)
    async lockById(id) {
      await db("rooms").where({ id }).forUpdate().first();
    }
  };
}

module.exports = { createKnexRoomsRepository };
