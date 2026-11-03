const { AppError } = require("../errors/AppError");

// Błędy constraints z PostgreSQL (SQLSTATE) -> HTTP; szczegóły bazy (err.detail, nazwy tabel) nie trafiają do klienta
const DATABASE_ERRORS = {
  "23505": { status: 409, code: "UNIQUE_VIOLATION", message: "Resource already exists" },
  "23P01": { status: 409, code: "ROOM_ALREADY_BOOKED", message: "Room is already booked in this time range" },
  "23503": { status: 409, code: "FOREIGN_KEY_VIOLATION", message: "Related resource does not exist or is still in use" },
  "23514": { status: 400, code: "CHECK_VIOLATION", message: "Data violates a database constraint" }
};

// Constraints, dla których klient dostaje konkretny kod zamiast ogólnego (np. równoległe rejestracje tego samego emaila)
const CONSTRAINT_ERRORS = {
  users_email_unique: { status: 409, code: "EMAIL_TAKEN", message: "Email already registered" }
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id
      }
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId: req.id }
    });
  }

  const databaseError = CONSTRAINT_ERRORS[err.constraint] ?? DATABASE_ERRORS[err.code];

  if (databaseError) {
    return res.status(databaseError.status).json({
      error: { code: databaseError.code, message: databaseError.message, requestId: req.id }
    });
  }

  // Szczegóły (w tym stack trace) trafiają tylko do logów servera
  console.error(`[${req.id}]`, err);

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected error", requestId: req.id }
  });
}

module.exports = errorHandler;
