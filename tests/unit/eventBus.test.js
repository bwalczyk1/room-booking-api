const { createEventBus } = require("../../src/events/eventBus");

describe("eventBus", () => {
  test("a failing listener does not break publish or other listeners", async () => {
    const eventBus = createEventBus();
    const received = jest.fn();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    eventBus.subscribe("reservation.created", () => {
      throw new Error("audit log is down");
    });

    eventBus.subscribe("reservation.created", received);

    expect(() => eventBus.publish("reservation.created", { reservationId: 1 })).not.toThrow();

    // Listenery działają asynchronicznie - czekamy jeden krok event loop
    await new Promise(resolve => setImmediate(resolve));

    expect(received).toHaveBeenCalledWith(expect.objectContaining({
      name: "reservation.created",
      payload: { reservationId: 1 }
    }));

    expect(consoleError).toHaveBeenCalledWith("[event:reservation.created] handler failed", expect.any(Error));

    consoleError.mockRestore();
  });
});
