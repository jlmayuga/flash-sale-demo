import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ClaimDialog from './ClaimDialog.jsx'

const sale = {
  productName: 'Limited Sneakers',
  remainingStock: 10,
  status: 'active',
  soldOut: false,
}

function renderDialog(overrides = {}) {
  const props = {
    sale,
    busy: false,
    checking: false,
    error: '',
    purchase: null,
    claimInfo: null,
    onCheckStatus: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }

  render(<ClaimDialog {...props} />)
  return props
}

describe('ClaimDialog', () => {
  it('normalizes and stores the customer identifier before submitting', async () => {
    const user = userEvent.setup()
    const props = renderDialog()

    await user.type(
      screen.getByLabelText('Customer identifier'),
      '  buyer@example.com  ',
    )
    await user.click(screen.getByRole('button', { name: /buy now/i }))

    expect(props.onSubmit).toHaveBeenCalledWith('buyer@example.com')
    expect(localStorage.getItem('flashy_customer_identifier')).toBe(
      'buyer@example.com',
    )
  })

  it('prevents another purchase when the customer reached the limit', () => {
    renderDialog({ claimInfo: { claimCount: 1, limitClaim: 1 } })

    expect(screen.getByRole('status')).toHaveTextContent(
      'already reached this sale’s purchase limit',
    )
    expect(
      screen.getByRole('button', { name: /purchase limit reached/i }),
    ).toBeDisabled()
  })

  it('does not close with Escape while a purchase is processing', async () => {
    const user = userEvent.setup()
    const props = renderDialog({ busy: true })

    await user.keyboard('{Escape}')

    expect(props.onClose).not.toHaveBeenCalled()
  })
})
