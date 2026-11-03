const { Router } = require("express");
const validate = require("../../middleware/validate");
const { registerBody, loginBody } = require("./auth.schemas");

// register i login są publiczne (inaczej nie dałoby się zalogować), /me wymaga tokenu
function createAuthRouter(controller, requireAuth) {
  const router = Router();

  router.post("/register", validate({ body: registerBody }), controller.register);
  router.post("/login", validate({ body: loginBody }), controller.login);
  router.get("/me", requireAuth, controller.me);

  return router;
}

module.exports = { createAuthRouter };
