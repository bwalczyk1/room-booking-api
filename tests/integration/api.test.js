const request = require("supertest");
const bcrypt = require("bcryptjs");
const config = require("../../src/config");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/knexUnitOfWork");

const NOW = new Date("2026-11-20T12:00:00Z");
const PASSWORD = "password-123";

// Aplikacja bez listen() - Supertest wysyła requesty bezpośrednio do Expressa
const app = createApp({ config, ...createKnexUnitOfWork(db), now: () => NOW });

let adminPasswordHash;

async function registerAndLogin(email) {
  await request(app).post("/api/auth/register").send({ email, password: PASSWORD }).expect(201);

  return login(email);
}

async function login(email) {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);

  return res.body.accessToken;
}

function createReservation(token, { roomId = 1, participants = 10, startTime, endTime }) {
  return request(app)
    .post("/api/reservations")
    .set("Authorization", `Bearer ${token}`)
    .send({ roomId, participants, startTime, endTime });
}

beforeAll(async () => {
  await db.migrate.latest();
  adminPasswordHash = await bcrypt.hash(PASSWORD, 4);
});

// Każdy test zaczyna od tego samego, znanego stanu
beforeEach(async () => {
  await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1" });

  await db("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 }
  ]);

  // ADMIN-a nie da się zarejestrować przez API - rejestracja zawsze nadaje rolę USER
  await db("users").insert({ email: "admin@example.com", password_hash: adminPasswordHash, role: "ADMIN" });
});

// Zamknięcie puli połączeń - bez tego Jest zgłasza open handles i nie kończy procesu
afterAll(async () => {
  await db.destroy();
});

describe("Auth", () => {
  test("registers, logs in and returns the current user from /api/auth/me", async () => {
    const registered = await request(app)
      .post("/api/auth/register")
      .send({ email: "jan@example.com", password: PASSWORD })
      .expect(201);

    expect(registered.body).toMatchObject({ email: "jan@example.com", role: "USER" });
    expect(registered.body).not.toHaveProperty("passwordHash");

    const token = await login("jan@example.com");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);

    expect(me.body).toMatchObject({ id: registered.body.id, email: "jan@example.com", role: "USER" });
  });

  test("401 without a token", async () => {
    const res = await request(app).get("/api/reservations");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Reservations API", () => {
  test("POST /api/reservations returns 201 with Location and saves the row", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await createReservation(token, {
      startTime: "2026-12-01T10:00:00Z",
      endTime: "2026-12-01T12:00:00Z"
    });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);

    const row = await db("reservations").where({ id: res.body.id }).first();

    expect(row).toMatchObject({ room_id: 1, user_id: 2, participants: 10, status: "CONFIRMED" });
    expect(row.start_time.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });

  test("400 with field details for an invalid body", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomId: "abc", participants: 0, startTime: "tomorrow" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    expect(res.body.error.details.map(detail => detail.field)).toEqual(
      expect.arrayContaining(["roomId", "participants", "startTime", "endTime"])
    );

    expect(res.body.error.details.every(detail => detail.location === "body")).toBe(true);
    expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "0" });
  });

  test("404 when a USER fetches someone else's reservation", async () => {
    const janToken = await registerAndLogin("jan@example.com");
    const annaToken = await registerAndLogin("anna@example.com");

    const { body: created } = await createReservation(janToken, {
      startTime: "2026-12-01T10:00:00Z",
      endTime: "2026-12-01T12:00:00Z"
    }).expect(201);

    const res = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${annaToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("409 ROOM_ALREADY_BOOKED for an overlapping reservation", async () => {
    const janToken = await registerAndLogin("jan@example.com");
    const annaToken = await registerAndLogin("anna@example.com");

    await createReservation(janToken, { startTime: "2026-12-01T10:00:00Z", endTime: "2026-12-01T12:00:00Z" }).expect(201);

    const res = await createReservation(annaToken, { startTime: "2026-12-01T11:00:00Z", endTime: "2026-12-01T13:00:00Z" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
    expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "1" });
  });

  test("pagination returns meta.total and at most limit items", async () => {
    const token = await registerAndLogin("jan@example.com");

    for (const day of ["01", "02", "03"]) {
      await createReservation(token, { startTime: `2026-12-${day}T10:00:00Z`, endTime: `2026-12-${day}T11:00:00Z` }).expect(201);
    }

    const res = await request(app).get("/api/reservations?limit=2").set("Authorization", `Bearer ${token}`).expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });
});

describe("Rooms API", () => {
  test("403 when a USER tries to create a room", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 40 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await db("rooms").where({ name: "301" }).first()).toBeUndefined();
  });

  test("ADMIN creates a room (201)", async () => {
    const token = await login("admin@example.com");

    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 40 });

    expect(res.status).toBe(201);
    expect(await db("rooms").where({ name: "301" }).first()).toMatchObject({ building_id: 1, capacity: 40 });
  });
});

describe("Audit log API", () => {
  async function insertEntries() {
    await db("audit_log").insert([
      { event_type: "reservation.created", payload: { reservationId: 1 }, created_at: "2026-11-20T10:00:00Z" },
      { event_type: "reservation.created", payload: { reservationId: 2 }, created_at: "2026-11-20T11:00:00Z" },
      { event_type: "reservation.cancelled", payload: { reservationId: 1 }, created_at: "2026-11-20T12:00:00Z" }
    ]);
  }

  test("403 for a USER", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("ADMIN gets entries newest first, filtered by eventType and paginated", async () => {
    await insertEntries();

    const token = await login("admin@example.com");

    const res = await request(app)
      .get("/api/admin/audit-log?eventType=reservation.created&limit=1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });

    expect(res.body.data).toEqual([
      { id: 2, eventType: "reservation.created", payload: { reservationId: 2 }, createdAt: "2026-11-20T11:00:00.000Z" }
    ]);
  });
});
