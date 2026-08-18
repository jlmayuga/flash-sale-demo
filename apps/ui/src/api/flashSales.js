const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

async function parseResponse(response, fallbackMessage) {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(
      body?.message || `${fallbackMessage} (${response.status})`,
    )
    error.status = response.status
    throw error
  }
  return body
}

export async function getFlashSales({ signal } = {}) {
  const response = await fetch(`${API_URL}/api/sale/flash`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  const body = await parseResponse(response, 'Could not load flash sales')
  return Array.isArray(body.sales) ? body.sales : []
}

export async function getFlashSaleStatus(saleId) {
  const response = await fetch(
    `${API_URL}/api/sale/${encodeURIComponent(saleId)}/status`,
    {
      headers: { Accept: 'application/json' },
    },
  )
  const body = await parseResponse(response, 'Could not load sale status')
  return body.sale
}

export async function getUserClaimStatus(saleId, userIdentifier) {
  const query = new URLSearchParams({ userIdentifier })
  const response = await fetch(
    `${API_URL}/api/sale/${encodeURIComponent(saleId)}/claim-status?${query}`,
    {
      headers: { Accept: 'application/json' },
    },
  )
  const body = await parseResponse(response, 'Could not load purchase status')
  return body.claim
}

export async function claimFlashSale(saleId, userIdentifier) {
  const response = await fetch(
    `${API_URL}/api/sale/${encodeURIComponent(saleId)}/claim`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIdentifier }),
    },
  )

  const body = await parseResponse(response, 'Could not purchase this sale')
  return body.purchase
}
