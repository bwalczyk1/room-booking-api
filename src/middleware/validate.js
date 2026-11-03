const { ValidationError } = require("../errors/AppError");

// Waliduje wszystkie podane części requestu i zgłasza błędy ze wszystkich naraz
function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const part of ["params", "query", "body"]) {
      if (!schemas[part]) continue;

      const result = schemas[part].safeParse(req[part] ?? {});

      if (!result.success) {
        const issues = result.error.issues.map(issue => ({
          location: part,
          field: issue.path.join("."),
          message: issue.message
        }));

        details.push(...issues);
        continue;
      }

      validated[part] = result.data;
    }

    if (details.length > 0) {
      return next(new ValidationError(details));
    }

    req.validated = validated;
    next();
  };
}

module.exports = validate;
