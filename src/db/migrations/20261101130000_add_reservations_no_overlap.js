// Ostatnia linia obrony przed double bookingiem: dwie rezerwacje CONFIRMED tej samej sali
// nie mogą mieć nakładających się przedziałów [start_time, end_time)
exports.up = async function (knex) {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS btree_gist");

  await knex.raw(`
    ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
      EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      ) WHERE (status = 'CONFIRMED')
  `);
};

exports.down = async function (knex) {
  await knex.raw("ALTER TABLE reservations DROP CONSTRAINT reservations_no_overlap");
};
