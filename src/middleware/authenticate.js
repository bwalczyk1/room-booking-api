const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../errors/AppError");

// Odczytuje token z nagłówka Authorization: Bearer <token> i ustawia req.user = { id, role }
function authenticate(jwtSecret) {
  return (req, res, next) => {
    const header = req.get("Authorization");

    if (!header) return next(new UnauthorizedError());

    const match = /^Bearer (\S+)$/.exec(header);

    if (!match) return next(new UnauthorizedError("Authorization header must have the format: Bearer <token>"));

    try {
      // Jawna lista algorytmów - token z "alg": "none" albo innym algorytmem zostanie odrzucony
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });

      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch (err) {
      // Osobny kod dla wygasłego tokenu - frontend wie, że wystarczy zalogować się ponownie
      if (err.name === "TokenExpiredError") return next(new UnauthorizedError("Token expired", "TOKEN_EXPIRED"));

      next(new UnauthorizedError("Invalid token", "INVALID_TOKEN"));
    }
  };
}

module.exports = authenticate;
