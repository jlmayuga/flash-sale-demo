const healthDao = require('../dao/health.dao');
const { getRedis } = require('../config/redis');

const healthCheckTimeoutMs =
  Number(process.env.HEALTH_CHECK_TIMEOUT_MS) || 1000;

function withTimeout(check, dependency) {
  let timeout;

  return Promise.race([
    check,
    new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`${dependency} health check timed out`));
      }, healthCheckTimeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

async function getHealth() {
  const [databaseResult, redisResult] = await Promise.allSettled([
    withTimeout(healthDao.getDatabaseTime(), 'Database'),
    withTimeout(
      getRedis().then((redis) => redis.ping()),
      'Redis',
    ),
  ]);

  const database = databaseResult.status === 'fulfilled' ? 1 : 0;
  const redis = redisResult.status === 'fulfilled' ? 1 : 0;

  return {
    status: database === 1 && redis === 1 ? 'ok' : 'degraded',
    database,
    redis,
    databaseTime: database === 1 ? databaseResult.value : null,
  };
}

module.exports = { getHealth };
