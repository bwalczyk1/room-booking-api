const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createInMemoryUnitOfWork } = require("../../src/db/memoryUnitOfWork");

const NOW = new Date("2026-11-20T12:00:00Z");

const owner = { id: 2, role: "USER" };
const admin = { id: 1, role: "ADMIN" };

const existing = {
  id: 1,
  roomId: 1,
  userId: owner.id,
  participants: 10,
  startTime: new Date("2026-12-01T10:00:00Z"),
  endTime: new Date("2026-12-01T12:00:00Z"),
  status: "CONFIRMED",
  createdAt: NOW,
  cancelledAt: null,
  internalNote: null
};

// Spy zamiast prawdziwego event busa - efektem, który sprawdzamy, jest samo wywołanie publish
function setup() {
  const { runInTransaction } = createInMemoryUnitOfWork({ reservations: [existing] });
  const eventBus = { publish: jest.fn(), subscribe: jest.fn() };
  const service = createReservationsService({ runInTransaction, eventBus, now: () => NOW });

  return { service, eventBus };
}

describe("reservationsService events", () => {
  test("publishes reservation.created after a successful create", async () => {
    const { service, eventBus } = setup();

    const created = await service.createReservation({
      roomId: 1,
      participants: 10,
      startTime: "2026-12-01T12:00:00Z",
      endTime: "2026-12-01T13:00:00Z"
    }, owner);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: created.id,
      roomId: 1,
      userId: owner.id,
      startTime: "2026-12-01T12:00:00.000Z",
      endTime: "2026-12-01T13:00:00.000Z"
    });
  });

  test("does not publish when the create fails (409)", async () => {
    const { service, eventBus } = setup();

    await expect(service.createReservation({
      roomId: 1,
      participants: 10,
      startTime: "2026-12-01T11:00:00Z",
      endTime: "2026-12-01T13:00:00Z"
    }, owner)).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("publishes reservation.cancelled once - a repeated cancel publishes nothing", async () => {
    const { service, eventBus } = setup();

    await service.cancelReservation(1, admin);
    await service.cancelReservation(1, admin);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
      reservationId: 1,
      roomId: 1,
      userId: owner.id,
      cancelledBy: admin.id
    });
  });

  test("does not publish when the cancel fails", async () => {
    const { service, eventBus } = setup();

    await expect(service.cancelReservation(1, { id: 3, role: "USER" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
