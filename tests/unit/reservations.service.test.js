const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createInMemoryUnitOfWork } = require("../../src/db/memoryUnitOfWork");

const NOW = new Date("2026-11-20T12:00:00Z");

const admin = { id: 1, role: "ADMIN" };
const owner = { id: 2, role: "USER" };
const otherUser = { id: 3, role: "USER" };

const USERS = [admin, owner, otherUser].map(user => ({
  ...user,
  email: `user${user.id}@example.com`,
  passwordHash: "not-used-in-unit-tests",
  createdAt: NOW
}));

const BUILDINGS = [{ id: 1, name: "Budynek A", address: "ul. Testowa 1", createdAt: NOW }];

const ROOMS = [
  { id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: NOW },
  { id: 2, buildingId: 1, name: "102", capacity: 20, createdAt: NOW }
];

// Godziny w testach dotyczą 2026-12-01 (UTC), czyli przyszłości względem NOW
const at = time => new Date(`2026-12-01T${time}:00Z`);

function reservation(id, { roomId = 1, userId = owner.id, start = "10:00", end = "12:00", status = "CONFIRMED" } = {}) {
  return {
    id,
    roomId,
    userId,
    participants: 10,
    startTime: at(start),
    endTime: at(end),
    status,
    createdAt: NOW,
    cancelledAt: status === "CANCELLED" ? NOW : null,
    internalNote: null
  };
}

// Każdy test buduje własne repositories in-memory i własny zegar - kolejność testów nie ma znaczenia
function setup({ reservations = [] } = {}) {
  const clock = { now: NOW };

  const { runInTransaction } = createInMemoryUnitOfWork({
    users: USERS,
    buildings: BUILDINGS,
    rooms: ROOMS,
    reservations
  });

  const service = createReservationsService({ runInTransaction, now: () => clock.now });

  return { service, clock };
}

const input = ({ roomId = 1, participants = 10, start, end }) => ({
  roomId,
  participants,
  startTime: at(start).toISOString(),
  endTime: at(end).toISOString()
});

describe("reservationsService.createReservation - overlapping", () => {
  // Istniejąca rezerwacja sali 1: 10:00-12:00
  test.each([
    ["partial overlap at the start", "09:00", "11:00"],
    ["partial overlap at the end", "11:00", "13:00"],
    ["new range contains the existing one", "09:00", "13:00"],
    ["new range inside the existing one", "10:30", "11:30"],
    ["identical range", "10:00", "12:00"]
  ])("rejects %s (%s-%s)", async (name, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input({ start, end }), otherUser))
      .rejects.toMatchObject({ statusCode: 409, code: "ROOM_ALREADY_BOOKED" });
  });

  test.each([
    ["ends exactly when the existing one starts", "08:00", "10:00"],
    ["starts exactly when the existing one ends", "12:00", "14:00"]
  ])("allows a range that %s (%s-%s)", async (name, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input({ start, end }), otherUser))
      .resolves.toMatchObject({ status: "CONFIRMED", roomId: 1, userId: otherUser.id });
  });

  test("allows the same time range in another room", async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input({ roomId: 2, start: "10:00", end: "12:00" }), otherUser))
      .resolves.toMatchObject({ status: "CONFIRMED", roomId: 2 });
  });

  test("a CANCELLED reservation does not block its time range", async () => {
    const { service } = setup({ reservations: [reservation(1, { status: "CANCELLED" })] });

    await expect(service.createReservation(input({ start: "10:00", end: "12:00" }), otherUser))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });
});

describe("reservationsService.createReservation - capacity", () => {
  test("allows participants equal to the room capacity", async () => {
    const { service } = setup();

    await expect(service.createReservation(input({ participants: 30, start: "10:00", end: "11:00" }), owner))
      .resolves.toMatchObject({ participants: 30 });
  });

  test("rejects capacity + 1 participants", async () => {
    const { service } = setup();

    await expect(service.createReservation(input({ participants: 31, start: "10:00", end: "11:00" }), owner))
      .rejects.toMatchObject({ statusCode: 409, code: "ROOM_CAPACITY_EXCEEDED" });
  });
});

describe("reservationsService.createReservation - duration", () => {
  test.each([
    ["exactly 15 minutes", "10:00", "10:15"],
    ["exactly 8 hours", "08:00", "16:00"]
  ])("allows %s", async (name, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input({ start, end }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test.each([
    ["14 minutes", "10:00", "10:14"],
    ["8 hours 1 minute", "08:00", "16:01"]
  ])("rejects %s", async (name, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input({ start, end }), owner))
      .rejects.toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: [expect.objectContaining({ field: "endTime" })]
      });
  });
});

describe("reservationsService.cancelReservation", () => {
  test("rejects cancelling a reservation that has already started", async () => {
    const started = { ...reservation(1), startTime: new Date("2026-11-20T11:00:00Z"), endTime: new Date("2026-11-20T13:00:00Z") };
    const { service } = setup({ reservations: [started] });

    await expect(service.cancelReservation(1, owner))
      .rejects.toMatchObject({ statusCode: 409, code: "RESERVATION_ALREADY_STARTED" });
  });

  test("cancelling twice is idempotent and keeps the first cancelledAt", async () => {
    const { service, clock } = setup({ reservations: [reservation(1)] });

    const first = await service.cancelReservation(1, owner);

    clock.now = new Date("2026-11-20T15:00:00Z");

    const second = await service.cancelReservation(1, owner);

    expect(first).toMatchObject({ status: "CANCELLED", cancelledAt: NOW });
    expect(second).toMatchObject({ status: "CANCELLED", cancelledAt: NOW });
  });

  test("another USER cannot cancel someone else's reservation", async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.cancelReservation(1, otherUser))
      .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

    await expect(service.getReservation(1, owner)).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("ADMIN can cancel someone else's reservation", async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.cancelReservation(1, admin))
      .resolves.toMatchObject({ status: "CANCELLED", userId: owner.id });
  });
});
