exports.up = async function (knex) {
  await knex.schema.createTable("buildings", table => {
    table.increments("id").primary();
    table.string("name", 100).notNullable().unique();
    table.string("address", 200).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // RESTRICT: budynku z salami nie da się usunąć - najpierw trzeba świadomie przenieść albo usunąć sale
  await knex.schema.createTable("rooms", table => {
    table.increments("id").primary();
    table.integer("building_id").notNullable().references("id").inTable("buildings").onDelete("RESTRICT");
    table.string("name", 50).notNullable();
    table.integer("capacity").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["building_id", "name"]);
  });

  // RESTRICT: rezerwacje to historia i zobowiązania wobec osób, które zarezerwowały salę -
  // usunięcie sali nie może ich po cichu skasować (CASCADE) ani zostawić bez sali (SET NULL)
  await knex.schema.createTable("reservations", table => {
    table.increments("id").primary();
    table.integer("room_id").notNullable().references("id").inTable("rooms").onDelete("RESTRICT");
    table.string("reserved_by", 100).notNullable();
    table.integer("participants").notNullable();
    table.timestamp("start_time", { useTz: true }).notNullable();
    table.timestamp("end_time", { useTz: true }).notNullable();
    table.string("status", 20).notNullable().defaultTo("CONFIRMED");
    table.timestamp("cancelled_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("internal_note");
    table.index(["room_id", "start_time", "end_time"], "reservations_room_time_index");
  });

  await knex.raw("ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_check CHECK (capacity > 0)");
  await knex.raw("ALTER TABLE reservations ADD CONSTRAINT reservations_participants_check CHECK (participants > 0)");
  await knex.raw("ALTER TABLE reservations ADD CONSTRAINT reservations_time_check CHECK (end_time > start_time)");
  await knex.raw("ALTER TABLE reservations ADD CONSTRAINT reservations_status_check CHECK (status IN ('CONFIRMED', 'CANCELLED'))");
};

exports.down = async function (knex) {
  await knex.schema.dropTable("reservations");
  await knex.schema.dropTable("rooms");
  await knex.schema.dropTable("buildings");
};
