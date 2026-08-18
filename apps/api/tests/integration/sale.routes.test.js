jest.mock('../../src/services/sale.service')

const request = require('supertest')
const saleService = require('../../src/services/sale.service')
const app = require('../../src/app')

describe('sale API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('GET /api/sale/flash returns visible sales', async () => {
    const sales = [
      {
        id: 'upcoming-sale',
        productName: 'Upcoming Product',
        status: 'upcoming',
      },
    ]
    saleService.getVisibleSales.mockResolvedValue(sales)

    const response = await request(app).get('/api/sale/flash').expect(200)

    expect(response.body).toEqual({ sales })
    expect(saleService.getVisibleSales).toHaveBeenCalledTimes(1)
  })

  test('GET /api/sale/:id/status returns the requested status', async () => {
    const sale = {
      id: 'sale-1',
      status: 'active',
      remainingStock: 5,
      soldOut: false,
    }
    saleService.getSaleStatus.mockResolvedValue(sale)

    const response = await request(app)
      .get('/api/sale/sale-1/status')
      .expect(200)

    expect(response.body).toEqual({ sale })
    expect(saleService.getSaleStatus).toHaveBeenCalledWith('sale-1')
  })

  test('POST /api/sale/:id/claim returns a created purchase', async () => {
    const result = {
      status: 'success',
      code: 'PURCHASE_SUCCESSFUL',
      purchase: {
        id: 'purchase-1',
        saleId: 'sale-1',
        userIdentifier: 'customer@example.com',
      },
    }
    saleService.claimSale.mockResolvedValue(result)

    const response = await request(app)
      .post('/api/sale/sale-1/claim')
      .send({ userIdentifier: 'customer@example.com' })
      .expect(201)

    expect(response.body).toEqual(result)
    expect(saleService.claimSale).toHaveBeenCalledWith(
      'sale-1',
      'customer@example.com',
    )
  })

  test('returns the service status and code for a sold-out claim', async () => {
    const error = new Error('Flash sale is sold out')
    error.statusCode = 409
    error.code = 'SOLD_OUT'
    saleService.claimSale.mockRejectedValue(error)

    const response = await request(app)
      .post('/api/sale/sale-1/claim')
      .send({ userIdentifier: 'customer@example.com' })
      .expect(409)

    expect(response.body).toEqual({
      status: 'error',
      code: 'SOLD_OUT',
      message: 'Flash sale is sold out',
    })
  })
})
