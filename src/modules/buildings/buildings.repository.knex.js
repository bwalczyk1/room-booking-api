function toBuilding(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    roomsCount: Number(row.rooms_count ?? 0)
  };
}

// LEFT JOIN + GROUP BY: budynki bez sal też są w wyniku (z roomsCount = 0), wszystko jednym zapytaniem
function withRoomsCount(db) {
  return db("buildings as b")
    .leftJoin("rooms as rm", "rm.building_id", "b.id")
    .select("b.*")
    .count({ rooms_count: "rm.id" })
    .groupBy("b.id");
}

function createKnexBuildingsRepository(db) {
  return {
    async findAll() {
      const rows = await withRoomsCount(db).orderBy("b.id", "asc");

      return rows.map(toBuilding);
    },

    async findById(id) {
      return toBuilding(await withRoomsCount(db).where("b.id", id).first());
    },

    async create({ name, address }) {
      const [row] = await db("buildings").insert({ name, address }).returning("*");

      return toBuilding(row);
    },

    async update(id, changes) {
      await db("buildings").where({ id }).update(changes);

      return this.findById(id);
    },

    async delete(id) {
      await db("buildings").where({ id }).delete();
    }
  };
}

module.exports = { createKnexBuildingsRepository };
