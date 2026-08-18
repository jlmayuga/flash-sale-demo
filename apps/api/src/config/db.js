const { Pool } = require('pg');

function numberFromEnvironment(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const useTls = process.env.DATABASE_SSL === 'true';
const connectionOptions = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    };

const pool = new Pool({
  ...connectionOptions,
  max: numberFromEnvironment('DATABASE_POOL_MAX', 20),
  min: numberFromEnvironment('DATABASE_POOL_MIN', 2),
  connectionTimeoutMillis: numberFromEnvironment(
    'DATABASE_CONNECT_TIMEOUT_MS',
    3000,
  ),
  idleTimeoutMillis: numberFromEnvironment('DATABASE_IDLE_TIMEOUT_MS', 30000),
  maxLifetimeSeconds: numberFromEnvironment('DATABASE_MAX_LIFETIME_SECONDS', 300),
  ssl: useTls
    ? {
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : undefined,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error', error);
});

module.exports = pool;
