const bcrypt = require("bcryptjs");
const { BCRYPT_ROUNDS } = require("../../modules/auth/auth.service");

// Konta testowe do lokalnego developmentu. ADMIN-a da się utworzyć tylko tutaj - rejestracja zawsze nadaje rolę USER
const USERS = [
  { email: "admin@example.com", password: "admin-password-123", role: "ADMIN" },
  { email: "anna.nowak@example.com", password: "user-password-123", role: "USER" },
  { email: "jan.kowalski@example.com", password: "user-password-123", role: "USER" },
  { email: "piotr.wisniewski@example.com", password: "user-password-123", role: "USER" },
  { email: "katarzyna.zielinska@example.com", password: "user-password-123", role: "USER" },
  { email: "tomasz.lewandowski@example.com", password: "user-password-123", role: "USER" }
];

// Seedy uruchamiają się alfabetycznie - ten jest pierwszy, więc tylko on czyści tabele (CASCADE obejmuje zależne)
exports.seed = async function (knex) {
  await knex.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

  for (const { email, password, role } of USERS) {
    await knex("users").insert({ email, password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS), role });
  }
};
