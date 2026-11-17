const fs = require("node:fs");
const { parseEnv } = require("node:util");

// Jest uruchamia ten plik przed każdym plikiem testowym, zanim jakikolwiek moduł wczyta konfigurację.
// process.loadEnvFile() nie działa w sandboxie Jesta, więc .env czytamy ręcznie - bez nadpisywania
// zmiennych już ustawionych (w CI wygrywają wartości z workflow, a pliku .env tam nie ma)
if (fs.existsSync(".env")) {
  for (const [name, value] of Object.entries(parseEnv(fs.readFileSync(".env", "utf8")))) {
    process.env[name] ??= value;
  }
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/roombooking_test";

// Testy integracyjne czyszczą tabele - nigdy nie mogą trafić na bazę developerską
if (!new URL(testDatabaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name ends with _test");
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.JWT_EXPIRES_IN = "15m";
process.env.STORAGE = "postgres";
