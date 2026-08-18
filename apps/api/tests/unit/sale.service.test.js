jest.mock('../../src/dao/sale.dao')
jest.mock('../../src/services/claim-reservation.service')

const saleDao = require('../../src/dao/sale.dao')
const claimReservation = require('../../src/services/claim-reservation.service')
const saleService = require('../../src/services/sale.service')

function activeSale(overrides = {}) {
  return {
    id: 'sale-1',
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 60_000).toISOString(),
    remainingStock: 10,
    limitClaim: 1,
    existingClaims: 0,
    inactive: false,
    ...overrides,
  }
}

describe('sale service claim business rules', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rejects a missing customer identifier', async () => {
    await expect(saleService.claimSale('sale-1', '  ')).rejects.toMatchObject({
      statusCode: 400,
      message: 'userIdentifier is required',
    })
  })

  test('rejects an upcoming sale before reserving stock', async () => {
    saleDao.getClaimContext.mockResolvedValue(
      activeSale({ startsAt: new Date(Date.now() + 60_000).toISOString() }),
    )

    await expect(
      saleService.claimSale('sale-1', 'customer@example.com'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SALE_UPCOMING' })
    expect(claimReservation.reserve).not.toHaveBeenCalled()
  })

  test('rejects a customer who reached the per-user limit', async () => {
    saleDao.getClaimContext.mockResolvedValue(
      activeSale({ existingClaims: 2, limitClaim: 2 }),
    )

    await expect(
      saleService.claimSale('sale-1', 'customer@example.com'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CLAIM_LIMIT_REACHED',
    })
    expect(claimReservation.reserve).not.toHaveBeenCalled()
  })

  test('maps an exhausted atomic reservation to SOLD_OUT', async () => {
    saleDao.getClaimContext.mockResolvedValue(activeSale())
    claimReservation.reserve.mockResolvedValue(-1)

    await expect(
      saleService.claimSale('sale-1', 'customer@example.com'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SOLD_OUT' })
    expect(saleDao.createClaim).not.toHaveBeenCalled()
  })

  test('creates a durable purchase after a successful reservation', async () => {
    const purchase = {
      id: 'purchase-1',
      saleId: 'sale-1',
      userIdentifier: 'customer@example.com',
    }
    saleDao.getClaimContext.mockResolvedValue(activeSale())
    claimReservation.reserve.mockResolvedValue(1)
    saleDao.createClaim.mockResolvedValue({
      purchase,
      claimCount: 1,
      limitClaim: 1,
    })

    await expect(
      saleService.claimSale('sale-1', ' customer@example.com '),
    ).resolves.toMatchObject({
      status: 'success',
      code: 'PURCHASE_SUCCESSFUL',
      purchase,
    })
    expect(claimReservation.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sale-1' }),
      'customer@example.com',
      0,
    )
    expect(saleDao.createClaim).toHaveBeenCalledWith(
      'sale-1',
      'customer@example.com',
      expect.any(String),
    )
  })

  test('releases the reservation when the database purchase fails', async () => {
    const databaseError = new Error('database unavailable')
    saleDao.getClaimContext.mockResolvedValue(activeSale())
    claimReservation.reserve.mockResolvedValue(1)
    saleDao.createClaim.mockRejectedValue(databaseError)
    claimReservation.release.mockResolvedValue()

    await expect(
      saleService.claimSale('sale-1', 'customer@example.com'),
    ).rejects.toBe(databaseError)
    expect(claimReservation.release).toHaveBeenCalledWith(
      'sale-1',
      'customer@example.com',
    )
  })
})
