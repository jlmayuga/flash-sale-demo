import { useCallback, useEffect, useState } from 'react'
import {
  claimFlashSale,
  getFlashSales,
  getFlashSaleStatus,
  getUserClaimStatus,
} from '../../api/flashSales.js'
import FlashSaleCard from '../../components/FlashSaleCard/FlashSaleCard.jsx'
import ClaimDialog from '../../components/ClaimDialog/ClaimDialog.jsx'

const SALE_REFRESH_INTERVAL_MS = 5000

function saleHasChanged(currentSale, nextSale) {
  const currentFields = Object.keys(currentSale)
  const nextFields = Object.keys(nextSale)

  if (currentFields.length !== nextFields.length) {
    return true
  }

  return nextFields.some(
    (field) => !Object.is(currentSale[field], nextSale[field]),
  )
}

function reconcileSales(currentSales, nextSales) {
  const nextSalesById = new Map(nextSales.map((sale) => [sale.id, sale]))
  const currentIds = new Set(currentSales.map((sale) => sale.id))

  const retainedSales = currentSales
    .filter((sale) => nextSalesById.has(sale.id))
    .map((sale) => {
      const nextSale = nextSalesById.get(sale.id)
      return saleHasChanged(sale, nextSale) ? nextSale : sale
    })

  const addedSales = nextSales.filter((sale) => !currentIds.has(sale.id))
  const reconciledSales = [...retainedSales, ...addedSales]

  const nothingChanged =
    reconciledSales.length === currentSales.length &&
    reconciledSales.every((sale, index) => sale === currentSales[index])

  return nothingChanged ? currentSales : reconciledSales
}

function purchaseErrorMessage(error, sale) {
  const message = error.message.toLowerCase()

  if (error.status === 429 || message.includes('limit')) {
    return sale.limitClaim === 1
      ? 'You have already purchased this item.'
      : `You have already reached the limit of ${sale.limitClaim} purchases for this sale.`
  }
  if (message.includes('sold out')) {
    return 'This sale is sold out. No inventory remains.'
  }
  if (message.includes('not active')) {
    return 'This sale has ended or is no longer active.'
  }
  if (error.status === 404) {
    return 'This sale could not be found. It may have ended.'
  }
  if (error.status === 503) {
    return 'Purchases are temporarily unavailable. Please try again shortly.'
  }

  return error.message
}

export default function HomePage() {
  const [sales, setSales] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const [claimStatus, setClaimStatus] = useState('idle')
  const [claimError, setClaimError] = useState('')
  const [purchase, setPurchase] = useState(null)
  const [claimInfo, setClaimInfo] = useState(null)
  const [checkingClaim, setCheckingClaim] = useState(false)

  const loadSales = useCallback(async (signal, { background = false } = {}) => {
    if (!background) {
      setStatus('loading')
      setError('')
    }

    try {
      const result = await getFlashSales({ signal })
      const activeSales = result.filter((sale) => !sale.inactive)

      setSales((currentSales) => reconcileSales(currentSales, activeSales))
      setStatus('success')
      setError('')
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && !background) {
        setError(requestError.message)
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let requestInFlight = false

    async function refreshSales(background) {
      if (requestInFlight) {
        return
      }

      requestInFlight = true
      await loadSales(controller.signal, { background })
      requestInFlight = false
    }

    refreshSales(false)

    const refreshTimer = window.setInterval(() => {
      refreshSales(true)
    }, SALE_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(refreshTimer)
      controller.abort()
    }
  }, [loadSales])

  async function openClaim(sale) {
    setSelectedSale(sale)
    setClaimStatus('idle')
    setClaimError('')
    setPurchase(null)
    setClaimInfo(null)
    try {
      const currentStatus = await getFlashSaleStatus(sale.id)
      setSelectedSale((current) =>
        current ? { ...current, ...currentStatus } : current,
      )
      if (currentStatus.status !== 'active') {
        setClaimError(
          currentStatus.status === 'ended'
            ? 'This sale has ended.'
            : currentStatus.status === 'inactive'
              ? 'This sale is inactive.'
              : 'This sale has not started yet.',
        )
      } else if (currentStatus.soldOut) {
        setClaimError('This sale is sold out. No inventory remains.')
      }
    } catch (requestError) {
      setClaimError(purchaseErrorMessage(requestError, sale))
    }
  }

  function closeClaim() {
    if (claimStatus === 'loading') {
      return
    }
    setSelectedSale(null)
  }

  async function submitClaim(userIdentifier) {
    setClaimStatus('loading')
    setClaimError('')
    try {
      const [currentStatus, currentClaims] = await Promise.all([
        getFlashSaleStatus(selectedSale.id),
        getUserClaimStatus(selectedSale.id, userIdentifier),
      ])
      setSelectedSale((current) =>
        current ? { ...current, ...currentStatus } : current,
      )
      setClaimInfo(currentClaims)
      if (currentStatus.status !== 'active') {
        throw Object.assign(new Error('Flash sale is not active'), {
          status: 409,
        })
      }
      if (currentStatus.soldOut) {
        throw Object.assign(new Error('Flash sale is sold out'), {
          status: 409,
        })
      }
      if (currentClaims.claimCount >= currentClaims.limitClaim) {
        throw Object.assign(new Error('Claim limit reached'), { status: 429 })
      }

      const result = await claimFlashSale(selectedSale.id, userIdentifier)
      setPurchase(result)
      setClaimStatus('success')
      const refreshedSales = await getFlashSales()
      setSales((currentSales) =>
        reconcileSales(
          currentSales,
          refreshedSales.filter((sale) => !sale.inactive),
        ),
      )
      setSelectedSale((current) =>
        current
          ? {
              ...current,
              remainingStock: Math.max(0, current.remainingStock - 1),
            }
          : current,
      )
    } catch (requestError) {
      setClaimError(purchaseErrorMessage(requestError, selectedSale))
      setClaimStatus('error')
    }
  }

  async function checkClaimStatus(userIdentifier) {
    setCheckingClaim(true)
    setClaimError('')
    try {
      setClaimInfo(await getUserClaimStatus(selectedSale.id, userIdentifier))
    } catch (requestError) {
      setClaimInfo(null)
      setClaimError(purchaseErrorMessage(requestError, selectedSale))
    } finally {
      setCheckingClaim(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="nav">
        <a
          className="brand"
          href="/"
          aria-label="Flashy home"
        >
          <span>F</span> Flashy
        </a>
      </header>

      <main>
        <section
          className="sale-grid"
          aria-live="polite"
          aria-busy={status === 'loading'}
        >
          {status === 'loading' &&
            [1, 2].map((item) => (
              <div
                className="sale-card skeleton"
                key={item}
              />
            ))}

          {status === 'error' && (
            <div className="state-panel">
              <p className="eyebrow">Connection missed</p>
              <h2>The deals are playing hard to get.</h2>
              <p>
                {error}. Make sure the flash-sale API is running on port 5000.
              </p>
              <button
                type="button"
                onClick={() => loadSales()}
              >
                Try again
              </button>
            </div>
          )}

          {status === 'success' && sales.length === 0 && (
            <div className="state-panel">
              <h2>No Flash Sale.</h2>
              <button
                type="button"
                onClick={() => loadSales()}
              >
                Check again
              </button>
            </div>
          )}

          {status === 'success' &&
            sales.map((sale, index) => (
              <FlashSaleCard
                key={sale.id}
                sale={sale}
                position={index + 1}
                onClaim={openClaim}
              />
            ))}
        </section>
      </main>

      <footer>
        <span>Flashy / Flash sale demo</span>
        <span>Powered by flash-sale-api</span>
      </footer>
      {selectedSale && (
        <ClaimDialog
          sale={selectedSale}
          busy={claimStatus === 'loading'}
          checking={checkingClaim}
          error={claimError}
          purchase={purchase}
          claimInfo={claimInfo}
          onCheckStatus={checkClaimStatus}
          onSubmit={submitClaim}
          onClose={closeClaim}
        />
      )}
    </div>
  )
}
