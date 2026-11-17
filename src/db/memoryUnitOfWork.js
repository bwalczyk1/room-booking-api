const { createInMemoryUsersRepository } = require("../modules/users/users.repository.memory");
const { createInMemoryBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createInMemoryRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("../modules/reservations/reservations.repository.memory");

// W pamięci nie ma czego cofać - runInTransaction po prostu wywołuje funkcję.
// seed pozwala testom podać własne dane; pominięta tabela dostaje dane domyślne
function createInMemoryUnitOfWork(seed = {}) {
  const repositories = {};

  repositories.users = createInMemoryUsersRepository(repositories, seed.users);
  repositories.buildings = createInMemoryBuildingsRepository(repositories, seed.buildings);
  repositories.rooms = createInMemoryRoomsRepository(repositories, seed.rooms);
  repositories.reservations = createInMemoryReservationsRepository(repositories, seed.reservations);

  return { runInTransaction: fn => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork };
