const { toAuditLogResponse } = require("./audit.mapper");

function createAuditController(auditService) {
  return {
    async list(req, res) {
      const { items, meta } = await auditService.listEntries(req.validated.query);

      res.json({ data: items.map(toAuditLogResponse), meta });
    }
  };
}

module.exports = { createAuditController };
