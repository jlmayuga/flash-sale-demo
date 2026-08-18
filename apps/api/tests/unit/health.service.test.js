jest.mock('../../src/dao/health.dao')
jest.mock('../../src/config/redis')

const healthDao = require('../../src/dao/health.dao')
const { getRedis } = require('../../src/config/redis')
const healthService = require('../../src/services/health.service')

describe('health service dependency checks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('reports PostgreSQL and Redis as connected', async () => {
    const databaseTime = new Date('2026-08-18T00:00:00.000Z')
    const redis = { ping: jest.fn().mockResolvedValue('PONG') }
    healthDao.getDatabaseTime.mockResolvedValue(databaseTime)
    getRedis.mockResolvedValue(redis)

    await expect(healthService.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 1,
      redis: 1,
      databaseTime,
    })
    expect(redis.ping).toHaveBeenCalledTimes(1)
  })

  test('reports Redis as down when it is unavailable', async () => {
    const redisError = new Error('Redis unavailable')
    const databaseTime = new Date('2026-08-18T00:00:00.000Z')
    healthDao.getDatabaseTime.mockResolvedValue(databaseTime)
    getRedis.mockRejectedValue(redisError)

    await expect(healthService.getHealth()).resolves.toEqual({
      status: 'degraded',
      database: 1,
      redis: 0,
      databaseTime,
    })
  })

  test('reports PostgreSQL as down when it is unavailable', async () => {
    const redis = { ping: jest.fn().mockResolvedValue('PONG') }
    healthDao.getDatabaseTime.mockRejectedValue(new Error('Database unavailable'))
    getRedis.mockResolvedValue(redis)

    await expect(healthService.getHealth()).resolves.toEqual({
      status: 'degraded',
      database: 0,
      redis: 1,
      databaseTime: null,
    })
  })

  test('reports Redis as down when its connection does not settle', async () => {
    jest.useFakeTimers()
    const databaseTime = new Date('2026-08-18T00:00:00.000Z')
    healthDao.getDatabaseTime.mockResolvedValue(databaseTime)
    getRedis.mockReturnValue(new Promise(() => {}))

    const healthPromise = healthService.getHealth()
    await jest.advanceTimersByTimeAsync(1000)

    await expect(healthPromise).resolves.toEqual({
      status: 'degraded',
      database: 1,
      redis: 0,
      databaseTime,
    })
    jest.useRealTimers()
  })
})
