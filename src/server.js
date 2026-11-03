const config = require("./config");
const { createApp } = require("./app");

// Composition root - jedyne miejsce, które wybiera implementację repositories (domyślnie PostgreSQL)
function createUnitOfWork() {
  if (config.STORAGE === "memory") {
    const { createInMemoryUnitOfWork } = require("./db/memoryUnitOfWork");

    return createInMemoryUnitOfWork();
  }

  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/knexUnitOfWork");

  return createKnexUnitOfWork(db);
}

const app = createApp({
  config,
  ...createUnitOfWork(),
  now: () => new Date()
});

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT} (storage: ${config.STORAGE})`);
});
