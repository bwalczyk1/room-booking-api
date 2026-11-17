const config = require("./config");
const { createApp } = require("./app");

// Composition root - jedyne miejsce, które wybiera implementację repositories (domyślnie PostgreSQL)
function createStorage() {
  if (config.STORAGE === "memory") {
    const { createInMemoryUnitOfWork } = require("./db/memoryUnitOfWork");

    return { ...createInMemoryUnitOfWork(), close: async () => {} };
  }

  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/knexUnitOfWork");

  return { ...createKnexUnitOfWork(db), close: () => db.destroy() };
}

const storage = createStorage();

const app = createApp({
  config,
  runInTransaction: storage.runInTransaction,
  now: () => new Date()
});

const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT} (storage: ${config.STORAGE})`);
});

// Graceful shutdown: nie przyjmujemy nowych połączeń, kończymy trwające requesty, potem zamykamy pulę połączeń z bazą
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);

  server.close(async () => {
    await storage.close();
    console.log("HTTP server and database connections closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
