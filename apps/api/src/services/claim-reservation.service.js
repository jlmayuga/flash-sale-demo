const crypto = require('crypto');
const { getRedis } = require('../config/redis');

const reserveScript = `
  if redis.call('EXISTS', KEYS[1]) == 0 then
    redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
  end
  if redis.call('EXISTS', KEYS[2]) == 0 then
    redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[4])
  end

  local stock = tonumber(redis.call('GET', KEYS[1]))
  local claimed = tonumber(redis.call('GET', KEYS[2]))
  local claimLimit = tonumber(ARGV[3])

  if stock <= 0 then return -1 end
  if claimed >= claimLimit then return -2 end

  redis.call('DECR', KEYS[1])
  redis.call('INCR', KEYS[2])
  return 1
`;

const releaseScript = `
  if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('INCR', KEYS[1]) end
  if redis.call('EXISTS', KEYS[2]) == 1 and tonumber(redis.call('GET', KEYS[2])) > 0 then
    redis.call('DECR', KEYS[2])
  end
  return 1
`;

function keysFor(saleId, userIdentifier) {
  const saleHash = crypto.createHash('sha256').update(saleId).digest('hex');
  const userHash = crypto.createHash('sha256').update(userIdentifier).digest('hex');
  const prefix = `flash-sale:{${saleHash}}`;
  return { stockKey: `${prefix}:stock`, userKey: `${prefix}:user:${userHash}`, prefix };
}

async function reserve(sale, userIdentifier, existingClaims) {
  const client = await getRedis();
  const { stockKey, userKey } = keysFor(sale.id, userIdentifier);
  const ttlSeconds = Math.max(60, Math.ceil((new Date(sale.endsAt).getTime() - Date.now()) / 1000));

  return client.eval(reserveScript, {
    keys: [stockKey, userKey],
    arguments: [
      String(sale.remainingStock),
      String(existingClaims),
      String(sale.limitClaim),
      String(ttlSeconds),
    ],
  });
}

async function release(saleId, userIdentifier) {
  const client = await getRedis();
  const { stockKey, userKey } = keysFor(saleId, userIdentifier);
  await client.eval(releaseScript, { keys: [stockKey, userKey], arguments: [] });
}

async function invalidate(saleId) {
  const client = await getRedis();
  const { prefix } = keysFor(saleId, 'unused');
  for await (const keys of client.scanIterator({ MATCH: `${prefix}:*`, COUNT: 100 })) {
    if (keys.length > 0) await client.del(keys);
  }
}

module.exports = { reserve, release, invalidate };
