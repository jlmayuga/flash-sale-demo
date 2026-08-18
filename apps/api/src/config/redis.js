const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 3000,
    reconnectStrategy(retries) {
      const maximumDelay = Number(process.env.REDIS_RECONNECT_MAX_DELAY_MS) || 2000;
      return Math.min(50 * 2 ** retries, maximumDelay);
    },
  },
});
let connectPromise;

redis.on('error', (error) => {
  console.error('Redis error', error);
});

async function getRedis() {
  if (!redis.isOpen) {
    connectPromise ||= redis.connect().finally(() => {
      connectPromise = undefined;
    });
    await connectPromise;
  }
  return redis;
}

module.exports = { redis, getRedis };
