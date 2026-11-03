const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

// "Katarzyna Zielińska" -> "katarzyna.zielinska@example.com"
function emailFromName(name) {
  const localPart = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `${localPart}@example.com`;
}

exports.up = async function (knex) {
  // 1. Nowa kolumna najpierw jako nullable - istniejące rezerwacje nie mają jeszcze właściciela
  await knex.schema.alterTable("reservations", table => {
    table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
    table.index(["user_id"], "reservations_user_id_index");
  });

  // 2. Backfill: każda osoba z reserved_by dostaje konto USER, a jej rezerwacje - user_id tego konta
  const names = await knex("reservations").groupBy("reserved_by").orderByRaw("min(id)").pluck("reserved_by");

  for (const name of names) {
    const email = emailFromName(name);

    // Losowe hasło, którego nikt nie zna - konto trzeba będzie przejąć resetem hasła
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    await knex("users").insert({ email, password_hash: passwordHash, role: "USER" }).onConflict("email").ignore();

    const user = await knex("users").where({ email }).first("id");

    await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
  }

  // 3. Dopiero gdy każda rezerwacja ma właściciela: NOT NULL i usunięcie starej kolumny
  await knex.raw("ALTER TABLE reservations ALTER COLUMN user_id SET NOT NULL");

  await knex.schema.alterTable("reservations", table => {
    table.dropColumn("reserved_by");
  });
};

// Imienia i nazwiska nie da się odtworzyć - reserved_by dostaje email właściciela
exports.down = async function (knex) {
  await knex.schema.alterTable("reservations", table => {
    table.string("reserved_by", 100);
  });

  await knex.raw("UPDATE reservations r SET reserved_by = u.email FROM users u WHERE u.id = r.user_id");
  await knex.raw("ALTER TABLE reservations ALTER COLUMN reserved_by SET NOT NULL");

  await knex.schema.alterTable("reservations", table => {
    table.dropColumn("user_id");
  });
};
