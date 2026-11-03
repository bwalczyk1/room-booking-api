const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ConflictError, NotFoundError, UnauthorizedError } = require("../../errors/AppError");

const BCRYPT_ROUNDS = 12;

function createAuthService({ runInTransaction, jwtSecret, jwtExpiresIn }) {
  // Porównywany, gdy konta nie ma - zły email trwa tyle samo co złe hasło, więc czas odpowiedzi nic nie zdradza
  const dummyHash = bcrypt.hashSync("password-of-a-missing-account", BCRYPT_ROUNDS);

  async function register({ email, password }) {
    const existing = await runInTransaction(({ users }) => users.findByEmail(email));

    if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");

    // Hashowanie trwa kilkaset ms, więc nie trzyma otwartej transakcji
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Rola zawsze USER, nigdy z body. Równoległy duplikat zatrzyma UNIQUE (error handler -> 409 EMAIL_TAKEN)
    return runInTransaction(({ users }) => users.create({ email, passwordHash, role: "USER" }));
  }

  async function login({ email, password }) {
    const user = await runInTransaction(({ users }) => users.findByEmail(email));
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

    // Ten sam błąd dla złego emaila i złego hasła - nie da się sprawdzić, kto ma konto
    if (!user || !passwordOk) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

    // W payloadzie tylko to, co potrzebne do autoryzacji - token da się odczytać bez sekretu
    const accessToken = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: jwtExpiresIn,
      algorithm: "HS256"
    });

    return { accessToken, tokenType: "Bearer", expiresIn: jwtExpiresIn };
  }

  async function getCurrentUser(currentUser) {
    const user = await runInTransaction(({ users }) => users.findById(currentUser.id));

    if (!user) throw new NotFoundError("User");

    return user;
  }

  return { register, login, getCurrentUser };
}

module.exports = { createAuthService, BCRYPT_ROUNDS };
