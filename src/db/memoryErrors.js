// Odpowiedniki błędów PostgreSQL, żeby obie implementacje repositories zachowywały się tak samo
function uniqueViolation(constraint) {
  return Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505", constraint });
}

function foreignKeyViolation(constraint) {
  return Object.assign(new Error("update or delete violates foreign key constraint"), { code: "23503", constraint });
}

module.exports = { uniqueViolation, foreignKeyViolation };
