// Stałe daty i ID z 01_users.js: 2 Anna, 3 Jan, 4 Piotr, 5 Katarzyna, 6 Tomasz
exports.seed = async function (knex) {
  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { name: "Budynek B", address: "ul. Podchorążych 2, Kraków" },
    { name: "Budynek C", address: "al. Jana Pawła II 37, Kraków" }
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 },
    { building_id: 1, name: "201", capacity: 50 },
    { building_id: 2, name: "101", capacity: 25 },
    { building_id: 2, name: "Aula", capacity: 120 }
  ]);

  await knex("reservations").insert([
    {
      room_id: 1,
      user_id: 2,
      participants: 12,
      start_time: "2026-10-15T08:00:00Z",
      end_time: "2026-10-15T10:00:00Z",
      status: "CONFIRMED",
      created_at: "2026-10-01T09:30:00Z",
      internal_note: "seed: already started"
    },
    {
      room_id: 1,
      user_id: 3,
      participants: 20,
      start_time: "2026-12-01T10:00:00Z",
      end_time: "2026-12-01T12:00:00Z",
      status: "CONFIRMED",
      created_at: "2026-10-20T08:00:00Z",
      internal_note: "seed"
    },
    {
      room_id: 2,
      user_id: 4,
      participants: 15,
      start_time: "2026-12-01T09:00:00Z",
      end_time: "2026-12-01T11:00:00Z",
      status: "CANCELLED",
      cancelled_at: "2026-10-25T14:00:00Z",
      created_at: "2026-10-21T10:00:00Z",
      internal_note: "seed: cancelled"
    },
    {
      room_id: 4,
      user_id: 5,
      participants: 18,
      start_time: "2026-12-02T13:00:00Z",
      end_time: "2026-12-02T15:00:00Z",
      status: "CONFIRMED",
      created_at: "2026-10-22T11:00:00Z",
      internal_note: "seed"
    },
    {
      room_id: 5,
      user_id: 6,
      participants: 100,
      start_time: "2026-12-03T10:00:00Z",
      end_time: "2026-12-03T14:00:00Z",
      status: "CONFIRMED",
      created_at: "2026-10-23T12:00:00Z",
      internal_note: "seed"
    }
  ]);
};
