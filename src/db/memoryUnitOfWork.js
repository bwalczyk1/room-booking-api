const { createInMemoryUsersRepository } = require("../modules/users/users.repository.memory");
const { createInMemoryBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createInMemoryRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("../modules/reservations/reservations.repository.memory");

// W pamięci nie ma czego cofać - runInTransaction po prostu wywołuje funkcję
function createInMemoryUnitOfWork() {
  const repositories = {};

  repositories.users = createInMemoryUsersRepository(repositories);
  repositories.buildings = createInMemoryBuildingsRepository(repositories);
  repositories.rooms = createInMemoryRoomsRepository(repositories);
  repositories.reservations = createInMemoryReservationsRepository(repositories);

  return { runInTransaction: fn => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork };
