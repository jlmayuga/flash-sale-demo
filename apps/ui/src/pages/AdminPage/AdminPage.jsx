import { useCallback, useEffect, useState } from 'react'
import {
  createAdminSale,
  deleteAdminSale,
  getAdminSales,
  loginAdmin,
  updateAdminSale,
} from '../../api/adminSales.js'
import AdminLogin from '../../components/AdminLogin/AdminLogin.jsx'
import SaleForm from '../../components/SaleForm/SaleForm.jsx'

const TOKEN_KEY = 'flashy_admin_token'
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function saleStatus(sale) {
  const now = Date.now()
  if (sale.inactive) {
    return 'Inactive'
  }
  if (new Date(sale.startsAt).getTime() > now) {
    return 'Scheduled'
  }
  if (new Date(sale.endsAt).getTime() <= now) {
    return 'Ended'
  }
  return 'Live'
}

export default function AdminPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || '',
  )
  const [sales, setSales] = useState([])
  const [status, setStatus] = useState(token ? 'loading' : 'signed-out')
  const [error, setError] = useState('')
  const [formSale, setFormSale] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setSales([])
    setStatus('signed-out')
  }, [])

  const loadSales = useCallback(
    async (activeToken) => {
      setStatus('loading')
      setError('')
      try {
        setSales(await getAdminSales(activeToken))
        setStatus('ready')
      } catch (requestError) {
        if (requestError.status === 401 || requestError.status === 403) {
          logout()
        } else {
          setError(requestError.message)
          setStatus('error')
        }
      }
    },
    [logout],
  )

  useEffect(() => {
    if (token) {
      loadSales(token)
    }
  }, [token, loadSales])

  async function handleLogin(username, password) {
    setStatus('authenticating')
    setError('')
    try {
      const result = await loginAdmin(username, password)
      sessionStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
    } catch (requestError) {
      setError(requestError.message)
      setStatus('signed-out')
    }
  }

  async function handleSave(payload) {
    setSaving(true)
    setFormError('')
    try {
      if (formSale) {
        await updateAdminSale(token, formSale.id, payload)
      } else {
        await createAdminSale(token, payload)
      }
      setFormOpen(false)
      setFormSale(undefined)
      await loadSales(token)
    } catch (requestError) {
      if (requestError.status === 401) {
        logout()
      } else {
        setFormError(requestError.message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(sale) {
    if (
      !window.confirm(
        `Deactivate “${sale.productName}”? This is a soft delete and keeps its record.`,
      )
    )
      return
    try {
      await deleteAdminSale(token, sale.id)
      await loadSales(token)
    } catch (requestError) {
      if (requestError.status === 401) {
        logout()
      } else {
        setError(requestError.message)
      }
    }
  }

  if (!token)
    return (
      <AdminLogin
        onLogin={handleLogin}
        error={error}
        busy={status === 'authenticating'}
      />
    )

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a
          className="brand brand--light"
          href="/"
        >
          <span>F</span> Flashy
        </a>
        <nav>
          <a
            className="active"
            href="/admin"
          >
            <span>⌁</span> Flash sales
          </a>
          <a href="/">
            <span>↗</span> Storefront
          </a>
        </nav>
        <button onClick={logout}>
          Sign out <span>→</span>
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Operations / Inventory</p>
            <h1>Flash sales</h1>
            <p>Schedule drops and keep a close eye on stock.</p>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setFormSale(undefined)
              setFormError('')
              setFormOpen(true)
            }}
          >
            New flash sale <span>＋</span>
          </button>
        </header>
        <section className="admin-stats">
          <div>
            <span>Total drops</span>
            <strong>{sales.length}</strong>
          </div>
          <div>
            <span>Live now</span>
            <strong>
              {sales.filter((sale) => saleStatus(sale) === 'Live').length}
            </strong>
          </div>
          <div>
            <span>Units remaining</span>
            <strong>
              {sales.reduce((sum, sale) => sum + sale.remainingStock, 0)}
            </strong>
          </div>
        </section>
        <section className="admin-table-wrap">
          <div className="table-heading">
            <h2>All releases</h2>
            <button
              onClick={() => loadSales(token)}
              disabled={status === 'loading'}
            >
              ↻ Refresh
            </button>
          </div>
          {error && <p className="admin-alert">{error}</p>}
          {status === 'loading' ? (
            <p className="table-state">Loading sales…</p>
          ) : sales.length === 0 ? (
            <p className="table-state">
              No flash sales yet. Create the first one.
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Release</th>
                    <th>Status</th>
                    <th>Schedule</th>
                    <th>Inventory</th>
                    <th>Claim limit</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const currentStatus = saleStatus(sale)
                    return (
                      <tr key={sale.id}>
                        <td>
                          <strong>{sale.productName}</strong>
                          <small>{sale.id}</small>
                        </td>
                        <td>
                          <span
                            className={`status-pill status-pill--${currentStatus.toLowerCase()}`}
                          >
                            {currentStatus}
                          </span>
                        </td>
                        <td>
                          <span>
                            {dateFormatter.format(new Date(sale.startsAt))}
                          </span>
                          <small>
                            to {dateFormatter.format(new Date(sale.endsAt))}
                          </small>
                        </td>
                        <td>
                          <strong>{sale.remainingStock}</strong> /{' '}
                          {sale.totalStock}
                          <small>
                            {sale.totalStock
                              ? Math.round(
                                  (sale.remainingStock / sale.totalStock) * 100,
                                )
                              : 0}
                            % remaining
                          </small>
                        </td>
                        <td>
                          <strong>{sale.limitClaim}</strong>
                          <small>per user</small>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              onClick={() => {
                                setFormSale(sale)
                                setFormError('')
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="danger"
                              onClick={() => handleDelete(sale)}
                              disabled={sale.inactive}
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {formOpen && (
        <SaleForm
          sale={formSale}
          onSave={handleSave}
          onCancel={() => setFormOpen(false)}
          busy={saving}
          error={formError}
        />
      )}
    </div>
  )
}
