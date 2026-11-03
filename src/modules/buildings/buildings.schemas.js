const { z } = require("zod");

const idParams = z.object({
  id: z.coerce.number().int().positive()
});

const createBuildingBody = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200)
}).strict();

// PATCH: wszystkie pola opcjonalne, ale pusty body nic by nie zmienił
const updateBuildingBody = createBuildingBody.partial().refine(body => Object.keys(body).length > 0, {
  message: "At least one field is required"
});

module.exports = { idParams, createBuildingBody, updateBuildingBody };
