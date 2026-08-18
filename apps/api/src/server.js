require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const { redis } = require('./config/redis');
const { once } = require('node:events');

const port = Number(process.env.API_PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

server.keepAliveTimeout = Number(process.env.API_KEEP_ALIVE_TIMEOUT_MS) || 65000;
server.headersTimeout = Number(process.env.API_HEADERS_TIMEOUT_MS) || 66000;
server.requestTimeout = Number(process.env.API_REQUEST_TIMEOUT_MS) || 15000;

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received; shutting down`);

  const forceShutdown = setTimeout(() => {
    console.error('Shutdown timed out; forcing termination');
    process.exit(1);
  }, 5000);
  forceShutdown.unref();

  server.close();
  server.closeIdleConnections();

  try {
    await once(server, 'close');
    if (redis.isOpen) await redis.quit();
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to close PostgreSQL connection pool', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
