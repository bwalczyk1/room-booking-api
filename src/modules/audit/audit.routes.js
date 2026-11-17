const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { listAuditLogQuery } = require("./audit.schemas");

function createAuditRouter(controller) {
  const router = Router();

  router.get("/", authorize("ADMIN"), validate({ query: listAuditLogQuery }), controller.list);

  return router;
}

module.exports = { createAuditRouter };
