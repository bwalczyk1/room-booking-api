const { ForbiddenError, UnauthorizedError } = require("../errors/AppError");

// Reguły zależne tylko od roli - sprawdzane przed walidacją i przed service
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());

    if (!allowedRoles.includes(req.user.role)) return next(new ForbiddenError());

    next();
  };
}

module.exports = authorize;
