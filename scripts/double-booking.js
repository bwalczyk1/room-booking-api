// Wysyła równolegle 10 identycznych rezerwacji tej samej sali na ten sam przedział
// i sprawdza w bazie, ile rezerwacji CONFIRMED faktycznie powstało.
// Użycie: npx knex seed:run && node scripts/double-booking.js
const knex = require("knex");
const config = require("../src/config");
const knexConfig = require("../knexfile");

const BASE = `http://localhost:${config.PORT}/api`;
const REQUESTS = 10;

// Konto z seeda 01_users.js - właściciel rezerwacji pochodzi z tokenu
const CREDENTIALS = { email: "jan.kowalski@example.com", password: "user-password-123" };

const reservation = {
  roomId: 3,
  participants: 20,
  startTime: "2026-12-10T10:00:00Z",
  endTime: "2026-12-10T12:00:00Z"
};

async function login() {
  const response = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CREDENTIALS)
  });

  const { accessToken } = await response.json();

  return accessToken;
}

async function book(index, token) {
  const response = await fetch(`${BASE}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(reservation)
  });

  const body = await response.json();

  return { index, status: response.status, code: body.error?.code ?? `id ${body.id}` };
}

async function countConfirmed(db) {
  const { count } = await db("reservations")
    .where({ room_id: reservation.roomId, status: "CONFIRMED" })
    .where("start_time", "<", reservation.endTime)
    .where("end_time", ">", reservation.startTime)
    .count({ count: "*" })
    .first();

  return Number(count);
}

async function main() {
  const db = knex(knexConfig);

  try {
    const token = await login();
    const results = await Promise.all(Array.from({ length: REQUESTS }, (_, index) => book(index + 1, token)));

    for (const result of results) {
      console.log(`request ${String(result.index).padStart(2)}: ${result.status} ${result.code}`);
    }

    const summary = Object.entries(
      results.reduce((acc, { status }) => ({ ...acc, [status]: (acc[status] ?? 0) + 1 }), {})
    ).map(([status, count]) => `${count}x ${status}`);

    console.log(`statusy: ${summary.join(", ")}`);
    console.log(`rezerwacje CONFIRMED w bazie dla sali ${reservation.roomId} w tym przedziale: ${await countConfirmed(db)}`);
  } finally {
    await db.destroy();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
