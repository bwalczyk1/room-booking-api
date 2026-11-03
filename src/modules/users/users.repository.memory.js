const { uniqueViolation } = require("../../db/memoryErrors");

// Te same konta co w seedzie 01_users.js (hashe bcrypt policzone wcześniej, żeby start nie trwał kilku sekund)
const DEFAULT_USERS = [
  { id: 1, email: "admin@example.com", passwordHash: "$2b$12$sJxVdboy.n.syIgdAiubi.5D0mPkwD9WCmZKlbdk3skLD9PhDiLe6", role: "ADMIN" },
  { id: 2, email: "anna.nowak@example.com", passwordHash: "$2b$12$8wszVUkWjixvhZ5cWp.3qO3Z4fLsaxEGZoq6S/JQN9v1H8.VYVXjK", role: "USER" },
  { id: 3, email: "jan.kowalski@example.com", passwordHash: "$2b$12$nlE8QV1lXfkNCt1RaQLIwemvTMx3sYYUQjER5cwg2Rn9FR0cet6iK", role: "USER" },
  { id: 4, email: "piotr.wisniewski@example.com", passwordHash: "$2b$12$.03cB/t/SAOhKzaYyTIlF.KXLiQcyOnCRanSjOYBq5kxau2oEe8yO", role: "USER" },
  { id: 5, email: "katarzyna.zielinska@example.com", passwordHash: "$2b$12$SIkmvFyt8gHhM7VouEaaieu/DAjbdrkrIHi68xu2cx4nx1Ul4rDy.", role: "USER" },
  { id: 6, email: "tomasz.lewandowski@example.com", passwordHash: "$2b$12$Ii6CtQDnMtp40uBQVNNNnuI3tHA7stEIXBAObOdQZ.5ibZtE20INO", role: "USER" }
].map(user => ({ ...user, createdAt: new Date("2026-10-01T08:00:00Z") }));

function createInMemoryUsersRepository(repositories, seed = DEFAULT_USERS) {
  const users = structuredClone(seed);
  let nextUserId = Math.max(0, ...users.map(user => user.id)) + 1;

  return {
    async findById(id) {
      return users.find(user => user.id === id) ?? null;
    },

    async findByEmail(email) {
      return users.find(user => user.email === email) ?? null;
    },

    async create({ email, passwordHash, role }) {
      if (users.some(user => user.email === email)) throw uniqueViolation("users_email_unique");

      const user = { id: nextUserId++, email, passwordHash, role, createdAt: new Date() };

      users.push(user);

      return user;
    }
  };
}

module.exports = { createInMemoryUsersRepository };
