const { createKnexUsersRepository } = require("../modules/users/users.repository.knex");
const { createKnexBuildingsRepository } = require("../modules/buildings/buildings.repository.knex");
const { createKnexRoomsRepository } = require("../modules/rooms/rooms.repository.knex");
const { createKnexReservationsRepository } = require("../modules/reservations/reservations.repository.knex");

// db to obiekt knex albo transakcja (trx) - mają to samo API
function createKnexRepositories(db) {
  return {
    users: createKnexUsersRepository(db),
    buildings: createKnexBuildingsRepository(db),
    rooms: createKnexRoomsRepository(db),
    reservations: createKnexReservationsRepository(db)
  };
}

// Unit of Work: kod service dostaje repositories powiązane z jedną transakcją
function createKnexUnitOfWork(db) {
  return {
    runInTransaction: fn => db.transaction(trx => fn(createKnexRepositories(trx)))
  };
}

module.exports = { createKnexUnitOfWork };
