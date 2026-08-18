import { useEffect, useState } from 'react'

const blankSale = {
  id: '',
  productName: '',
  startsAt: '',
  endsAt: '',
  totalStock: '',
  remainingStock: '',
  limitClaim: 1,
  inactive: false,
}

function toLocalInput(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function SaleForm({ sale, onSave, onCancel, busy, error }) {
  const editing = Boolean(sale)
  const [form, setForm] = useState(blankSale)

  useEffect(() => {
    setForm(
      sale
        ? {
            ...sale,
            startsAt: toLocalInput(sale.startsAt),
            endsAt: toLocalInput(sale.endsAt),
          }
        : blankSale,
    )
  }, [sale])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }
  function submit(event) {
    event.preventDefault()
    onSave({
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      totalStock: Number(form.totalStock),
      remainingStock: Number(form.remainingStock),
      limitClaim: Number(form.limitClaim),
    })
  }

  return (
    <div
      className="form-overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <section
        className="sale-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-form-title"
      >
        <header>
          <div>
            <p className="eyebrow">{editing ? 'Update drop' : 'New release'}</p>
            <h2 id="sale-form-title">
              {editing ? 'Edit flash sale' : 'Create flash sale'}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <form
          className="admin-form sale-form"
          onSubmit={submit}
        >
          <label>
            Sale ID
            <input
              value={form.id}
              onChange={(e) => update('id', e.target.value)}
              placeholder="summer-drop-001"
              disabled={editing}
              required
            />
          </label>
          <label className="span-2">
            Product name
            <input
              value={form.productName}
              onChange={(e) => update('productName', e.target.value)}
              placeholder="Limited Edition Drop"
              required
            />
          </label>
          <label>
            Starts at
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => update('startsAt', e.target.value)}
              required
            />
          </label>
          <label>
            Ends at
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => update('endsAt', e.target.value)}
              required
            />
          </label>
          <label>
            Total stock
            <input
              type="number"
              min="0"
              step="1"
              value={form.totalStock}
              onChange={(e) => update('totalStock', e.target.value)}
              required
            />
          </label>
          <label>
            Remaining stock
            <input
              type="number"
              min="0"
              step="1"
              max={form.totalStock || undefined}
              value={form.remainingStock}
              onChange={(e) => update('remainingStock', e.target.value)}
              required
            />
          </label>
          <label>
            Claim limit per user
            <input
              type="number"
              min="1"
              step="1"
              value={form.limitClaim}
              onChange={(e) => update('limitClaim', e.target.value)}
              required
            />
          </label>
          <label className="checkbox span-2">
            <input
              type="checkbox"
              checked={form.inactive}
              onChange={(e) => update('inactive', e.target.checked)}
            />
            <span>Mark this sale as inactive</span>
          </label>
          {error && (
            <p
              className="form-error span-2"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="form-actions span-2">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={busy}
            >
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create sale'}{' '}
              <span>→</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
