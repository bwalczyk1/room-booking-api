const { z } = require("zod");

const SORT_VALUES = ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"];

const idParams = z.object({
  id: z.coerce.number().int().positive()
});

// userId działa tylko dla ADMIN-a - sprawdza to service, bo zależy od zalogowanego użytkownika
const listReservationsQuery = z.object({
  userId: z.coerce.number().int().positive().optional(),
  roomId: z.coerce.number().int().positive().optional(),
  buildingId: z.coerce.number().int().positive().optional(),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(SORT_VALUES).default("startTime")
}).refine(query => !query.from || !query.to || new Date(query.from) < new Date(query.to), {
  message: "from must be earlier than to",
  path: ["to"]
});

// Właściciel rezerwacji pochodzi wyłącznie z tokenu - userId / reservedBy w body -> 400 (.strict())
const createReservationBody = z.object({
  roomId: z.number().int().positive(),
  participants: z.number().int().positive(),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true })
}).strict();

module.exports = { idParams, listReservationsQuery, createReservationBody };
