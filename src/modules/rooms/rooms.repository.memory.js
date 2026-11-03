const { uniqueViolation, foreignKeyViolation } = require("../../db/memoryErrors");

const DEFAULT_ROOMS = [
  { id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 2, buildingId: 1, name: "102", capacity: 20, createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 3, buildingId: 1, name: "201", capacity: 50, createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 4, buildingId: 2, name: "101", capacity: 25, createdAt: new Date("2026-10-01T08:00:00Z") },
  { id: 5, buildingId: 2, name: "Aula", capacity: 120, createdAt: new Date("2026-10-01T08:00:00Z") }
];

function createInMemoryRoomsRepository(repositories, seed = DEFAULT_ROOMS) {
  const rooms = structuredClone(seed);
  let nextRoomId = Math.max(0, ...rooms.map(room => room.id)) + 1;

  async function withBuilding(room) {
    const building = await repositories.buildings.findById(room.buildingId);

    return { ...room, building: { id: building.id, name: building.name } };
  }

  return {
    async findAll() {
      return Promise.all(rooms.map(withBuilding));
    },

    async findById(id) {
      const room = rooms.find(room => room.id === id);

      return room ? withBuilding(room) : null;
    },

    async findByBuilding(buildingId) {
      return Promise.all(rooms.filter(room => room.buildingId === buildingId).map(withBuilding));
    },

    async countByBuilding(buildingId) {
      return rooms.filter(room => room.buildingId === buildingId).length;
    },

    async create({ buildingId, name, capacity }) {
      if (rooms.some(room => room.buildingId === buildingId && room.name === name)) throw uniqueViolation("rooms_building_id_name_unique");

      const room = { id: nextRoomId++, buildingId, name, capacity, createdAt: new Date() };

      rooms.push(room);

      return withBuilding(room);
    },

    async update(id, changes) {
      const room = rooms.find(room => room.id === id);

      if (rooms.some(other => other.id !== id && other.buildingId === room.buildingId && other.name === changes.name)) {
        throw uniqueViolation("rooms_building_id_name_unique");
      }

      Object.assign(room, changes);

      return withBuilding(room);
    },

    async delete(id) {
      if (await repositories.reservations.countByRoom(id) > 0) throw foreignKeyViolation("reservations_room_id_foreign");

      rooms.splice(rooms.findIndex(room => room.id === id), 1);
    },

    // W pamięci nie ma równoległych transakcji - blokada niczego nie robi
    async lockById() {}
  };
}

module.exports = { createInMemoryRoomsRepository };
