import { useState } from 'react'

export default function AdminLogin({ onLogin, error, busy }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  function submit(event) {
    event.preventDefault()
    onLogin(credentials.username, credentials.password)
  }

  return (
    <main className="admin-login">
      <section className="admin-login__intro">
        <a
          className="brand brand--light"
          href="/"
        >
          <span>F</span> Flashy
        </a>
        <div>
          <p className="eyebrow">Private access</p>
          <h1>
            Control the
            <br />
            <em>rush.</em>
          </h1>
          <p>
            Manage stock, schedules, and every live drop from one focused
            workspace.
          </p>
        </div>
      </section>
      <section className="admin-login__form-wrap">
        <form
          className="admin-form login-form"
          onSubmit={submit}
        >
          <p className="eyebrow">Admin portal</p>
          <h2>Welcome back.</h2>
          <label>
            Username
            <input
              autoFocus
              autoComplete="username"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              required
            />
          </label>
          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'} <span>→</span>
          </button>
          <a
            className="back-link"
            href="/"
          >
            ← Return to storefront
          </a>
        </form>
      </section>
    </main>
  )
}
