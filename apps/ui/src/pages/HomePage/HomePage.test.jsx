import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlashSales } from '../../api/flashSales.js'
import HomePage from './HomePage.jsx'

vi.mock('../../api/flashSales.js', () => ({
  claimFlashSale: vi.fn(),
  getFlashSales: vi.fn(),
  getFlashSaleStatus: vi.fn(),
  getUserClaimStatus: vi.fn(),
}))

const activeSale = {
  id: 'summer-drop-001',
  productName: 'Limited Sneakers',
  startsAt: '2020-01-01T00:00:00.000Z',
  endsAt: '2099-01-01T00:00:00.000Z',
  totalStock: 100,
  remainingStock: 75,
  limitClaim: 1,
  inactive: false,
}

describe('HomePage', () => {
  beforeEach(() => {
    getFlashSales.mockReset()
  })

  it('lists active flash sales returned by the API', async () => {
    getFlashSales.mockResolvedValue([
      activeSale,
      {
        ...activeSale,
        id: 'hidden-drop',
        productName: 'Inactive Sneakers',
        inactive: true,
      },
    ])

    render(<HomePage />)

    expect(
      await screen.findByRole('heading', { name: 'Limited Sneakers' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/summer-drop-001/)).toBeInTheDocument()
    expect(screen.getByText('75 of 100 left')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buy now/i })).toBeEnabled()
    expect(screen.queryByText('Inactive Sneakers')).not.toBeInTheDocument()
    expect(getFlashSales).toHaveBeenCalledOnce()
    expect(getFlashSales).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })
})
