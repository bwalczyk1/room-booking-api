const { z } = require("zod");

try {
  process.loadEnvFile();
} catch {
  // brak pliku .env - zmienne mogą przyjść z zewnątrz (np. z Dockera)
}

// Komunikat dla brakującej zmiennej i osobny dla złej wartości
function message(name, hint) {
  return issue => (issue.input === undefined ? `${name} is required` : hint);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: message("DATABASE_URL", "DATABASE_URL must be a postgres:// URL")
  }),
  JWT_SECRET: z.string({ error: message("JWT_SECRET") }).min(32, "JWT_SECRET must have at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must be a number with a unit, e.g. 15m, 10s, 1h").default("15m"),
  STORAGE: z.enum(["postgres", "memory"]).default("postgres")
});

const result = envSchema.safeParse(process.env);

// Fail fast: z błędną konfiguracją aplikacja w ogóle nie startuje
if (!result.success) {
  console.error("Invalid environment configuration:");

  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

module.exports = Object.freeze(result.data);
