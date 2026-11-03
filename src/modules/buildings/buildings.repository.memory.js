const { uniqueViolation, foreignKeyViolation } = require("../../db/memoryErrors");

const DEFAULT_BUILDINGS = [
  { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków", createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 2, name: "Budynek B", address: "ul. Podchorążych 2, Kraków", createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 3, name: "Budynek C", address: "al. Jana Pawła II 37, Kraków", createdAt: new Date("2026-10-01T08:00:00Z") }
];

// repositories - wspólny obiekt wszystkich repozytoriów in-memory (potrzebny do liczenia sal)
function createInMemoryBuildingsRepository(repositories, seed = DEFAULT_BUILDINGS) {
  const buildings = structuredClone(seed);
  let nextBuildingId = Math.max(0, ...buildings.map(building => building.id)) + 1;

  async function withRoomsCount(building) {
    return { ...building, roomsCount: await repositories.rooms.countByBuilding(building.id) };
  }

  return {
    async findAll() {
      return Promise.all(buildings.map(withRoomsCount));
    },

    async findById(id) {
      const building = buildings.find(building => building.id === id);

      return building ? withRoomsCount(building) : null;
    },

    async create({ name, address }) {
      if (buildings.some(building => building.name === name)) throw uniqueViolation("buildings_name_unique");

      const building = { id: nextBuildingId++, name, address, createdAt: new Date() };

      buildings.push(building);

      return withRoomsCount(building);
    },

    async update(id, changes) {
      if (buildings.some(building => building.id !== id && building.name === changes.name)) {
        throw uniqueViolation("buildings_name_unique");
      }

      const building = buildings.find(building => building.id === id);

      Object.assign(building, changes);

      return withRoomsCount(building);
    },

    async delete(id) {
      if (await repositories.rooms.countByBuilding(id) > 0) throw foreignKeyViolation("rooms_building_id_foreign");

      buildings.splice(buildings.findIndex(building => building.id === id), 1);
    }
  };
}

module.exports = { createInMemoryBuildingsRepository };
