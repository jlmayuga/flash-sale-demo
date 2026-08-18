import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AdminLogin from './AdminLogin.jsx'

describe('AdminLogin', () => {
  it('submits the entered username and password', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    render(
      <AdminLogin
        onLogin={onLogin}
        error=""
        busy={false}
      />,
    )

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onLogin).toHaveBeenCalledOnce()
    expect(onLogin).toHaveBeenCalledWith('admin', 'secret')
  })

  it('shows an error and disables submission while signing in', () => {
    render(
      <AdminLogin
        onLogin={vi.fn()}
        error="Invalid credentials"
        busy
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
