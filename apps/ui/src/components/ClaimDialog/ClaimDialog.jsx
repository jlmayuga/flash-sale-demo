import { useEffect, useState } from 'react'

const CUSTOMER_KEY = 'flashy_customer_identifier'

export default function ClaimDialog({
  sale,
  busy,
  checking,
  error,
  purchase,
  claimInfo,
  onCheckStatus,
  onSubmit,
  onClose,
}) {
  const [userIdentifier, setUserIdentifier] = useState(
    () => localStorage.getItem(CUSTOMER_KEY) || '',
  )

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onClose])

  function submit(event) {
    event.preventDefault()
    const normalizedIdentifier = userIdentifier.trim()
    if (!normalizedIdentifier) {
      return
    }
    localStorage.setItem(CUSTOMER_KEY, normalizedIdentifier)
    onSubmit(normalizedIdentifier)
  }

  function checkStatus() {
    const normalizedIdentifier = userIdentifier.trim()
    if (normalizedIdentifier) {
      onCheckStatus(normalizedIdentifier)
    }
  }

  const limitReached = claimInfo && claimInfo.claimCount >= claimInfo.limitClaim
  const saleUnavailable =
    sale.status && (sale.status !== 'active' || sale.soldOut)

  return (
    <div
      className="claim-overlay"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        className="claim-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
      >
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          ×
        </button>
        {purchase ? (
          <div className="claim-success">
            <span className="claim-success__mark">✓</span>
            <p className="eyebrow">Purchase successful</p>
            <h2 id="claim-title">It’s yours.</h2>
            <p>
              Your purchase of <strong>{sale.productName}</strong> was completed
              successfully.
            </p>
            <dl>
              <div>
                <dt>Confirmation</dt>
                <dd>{purchase.id}</dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{purchase.userIdentifier}</dd>
              </div>
            </dl>
            <button
              className="primary-button"
              type="button"
              onClick={onClose}
            >
              Continue browsing <span>→</span>
            </button>
          </div>
        ) : (
          <form
            className="claim-form"
            onSubmit={submit}
          >
            <p className="eyebrow">
              Live sale · {sale.remainingStock} available
            </p>
            <h2 id="claim-title">Buy {sale.productName}</h2>
            <label>
              Customer identifier
              <input
                autoFocus
                value={userIdentifier}
                onChange={(event) => setUserIdentifier(event.target.value)}
                onBlur={checkStatus}
                placeholder="Email"
                autoComplete="email"
                type="email"
                required
              />
            </label>
            {checking && (
              <p className="claim-history claim-history--loading">
                Checking your purchase history…
              </p>
            )}
            {!checking && claimInfo && (
              <div
                className={`claim-history${limitReached ? ' claim-history--limit' : ''}`}
                role="status"
              >
                <span>
                  {limitReached
                    ? 'You have already reached this sale’s purchase limit.'
                    : `${claimInfo.limitClaim - claimInfo.claimCount} remaining for this identifier.`}
                </span>
              </div>
            )}
            {error && (
              <p
                className="form-error purchase-feedback"
                role="alert"
              >
                <strong>Purchase unsuccessful.</strong>
                <span>{error}</span>
              </p>
            )}
            <button
              className="primary-button"
              disabled={busy || checking || limitReached || saleUnavailable}
            >
              {busy
                ? 'Processing…'
                : saleUnavailable
                  ? sale.soldOut
                    ? 'Sold out'
                    : 'Sale unavailable'
                  : limitReached
                    ? 'Purchase limit reached'
                    : 'Buy now'}{' '}
              <span>→</span>
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
