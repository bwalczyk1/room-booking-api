const { z } = require("zod");

const idParams = z.object({
  id: z.coerce.number().int().positive()
});

const createRoomBody = z.object({
  buildingId: z.number().int().positive(),
  name: z.string().trim().min(1).max(50),
  capacity: z.number().int().positive()
}).strict();

// Salę można przemianować albo zmienić jej pojemność; przeniesienie do innego budynku nie jest obsługiwane
const updateRoomBody = createRoomBody.omit({ buildingId: true }).partial().refine(body => Object.keys(body).length > 0, {
  message: "At least one field is required"
});

module.exports = { idParams, createRoomBody, updateRoomBody };
