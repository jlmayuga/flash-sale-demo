require('dotenv').config()

const { performance } = require('node:perf_hooks')

const baseUrl = (
  process.env.BASE_URL || `http://localhost:${process.env.API_PORT || 5000}`
).replace(/\/$/, '')
const requests = positiveInteger('REQUESTS', 2000)
const concurrency = positiveInteger('CONCURRENCY', 2000)
const stock = positiveInteger('STOCK', 1000)
const durationSeconds = nonNegativeNumber('DURATION_SECONDS', 0)
const adminUsername = process.env.ADMIN_USERNAME || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'change_me'

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}

function nonNegativeNumber(name, fallback) {
  const value = Number(process.env[name] || fallback)

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`)
  }

  return value
}

async function parseResponse(response) {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(body?.message || `HTTP ${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }

  return body
}

async function createDisposableSale() {
  const credentials = Buffer.from(
    `${adminUsername}:${adminPassword}`,
  ).toString('base64')
  const authResponse = await fetch(`${baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  })
  const { token } = await parseResponse(authResponse)
  const saleId = `stress-${Date.now()}`
  const startsAt = new Date(Date.now() - 60_000).toISOString()
  const endsAt = new Date(Date.now() + 30 * 60_000).toISOString()

  const createResponse = await fetch(`${baseUrl}/api/admin/flash-sales`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: saleId,
      productName: 'Concurrent Stress Test',
      startsAt,
      endsAt,
      totalStock: stock,
      remainingStock: stock,
      limitClaim: 1,
    }),
  })
  await parseResponse(createResponse)

  return saleId
}

async function claim(saleId, index) {
  const startedAt = performance.now()
  const response = await fetch(`${baseUrl}/api/sale/${saleId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIdentifier: `stress-user-${saleId}-${index}@example.com`,
    }),
  })
  const body = await response.json().catch(() => null)

  return {
    status: response.status,
    code: body?.code,
    durationMs: performance.now() - startedAt,
  }
}

async function runPool(saleId) {
  const results = durationSeconds > 0 ? [] : new Array(requests)
  let nextIndex = 0
  const deadline = performance.now() + durationSeconds * 1000

  async function worker() {
    while (
      durationSeconds > 0 ? performance.now() < deadline : nextIndex < requests
    ) {
      const index = nextIndex
      nextIndex += 1
      const result = await claim(saleId, index)

      if (durationSeconds > 0) {
        results.push(result)
      } else {
        results[index] = result
      }
    }
  }

  const workerCount =
    durationSeconds > 0 ? concurrency : Math.min(concurrency, requests)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * fraction) - 1]
}

async function main() {
  console.log(`Creating disposable sale through ${baseUrl}`)
  const saleId = await createDisposableSale()
  const startedAt = performance.now()
  const results = await runPool(saleId)
  const elapsedMs = performance.now() - startedAt
  const statusCounts = results.reduce((counts, result) => {
    const key = `${result.status}${result.code ? ` ${result.code}` : ''}`
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
  const statusResponse = await fetch(`${baseUrl}/api/sale/${saleId}/status`)
  const { sale } = await parseResponse(statusResponse)
  const successfulClaims = results.filter((result) => result.status === 201)
    .length
  const soldOutClaims = results.filter(
    (result) => result.status === 409 && result.code === 'SOLD_OUT',
  ).length
  const serverErrors = results.filter((result) => result.status >= 500).length
  const completedRequests = results.length
  const expectedSuccesses = Math.min(stock, completedRequests)
  const expectedRemainingStock = stock - expectedSuccesses
  const durations = results.map((result) => result.durationMs)
  const summary = {
    saleId,
    mode: durationSeconds > 0 ? 'soak' : 'fixed',
    requests: completedRequests,
    configuredDurationSeconds: durationSeconds || undefined,
    concurrency,
    startingStock: stock,
    elapsedMs: Number(elapsedMs.toFixed(1)),
    throughputPerSecond: Number(
      ((completedRequests / elapsedMs) * 1000).toFixed(1),
    ),
    p50Ms: Number(percentile(durations, 0.5).toFixed(1)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(1)),
    statusCounts,
    successfulClaims,
    soldOutClaims,
    finalRemainingStock: sale.remainingStock,
    serverErrors,
  }

  console.log(JSON.stringify(summary, null, 2))

  const invariantFailures = []

  if (successfulClaims !== expectedSuccesses) {
    invariantFailures.push(
      `expected ${expectedSuccesses} successful claims, received ${successfulClaims}`,
    )
  }
  if (sale.remainingStock !== expectedRemainingStock) {
    invariantFailures.push(
      `expected remaining stock ${expectedRemainingStock}, received ${sale.remainingStock}`,
    )
  }
  if (successfulClaims > stock) {
    invariantFailures.push('successful claims exceeded starting stock')
  }
  if (
    completedRequests > stock &&
    soldOutClaims !== completedRequests - stock
  ) {
    invariantFailures.push('excess claims were not consistently rejected as sold out')
  }
  if (serverErrors > 0) {
    invariantFailures.push(`${serverErrors} requests returned server errors`)
  }

  if (invariantFailures.length > 0) {
    throw new Error(`Stress test failed:\n- ${invariantFailures.join('\n- ')}`)
  }

  console.log('PASS: inventory never oversold and all concurrency invariants held.')
}

main().catch((error) => {
  if (
    error.message === 'fetch failed' ||
    error.cause?.code === 'ECONNREFUSED'
  ) {
    console.error(
      `Could not connect to ${baseUrl}. Start the API with "npm run dev:api" or set BASE_URL to a running stack.`,
    )
  } else {
    console.error(error.message)
  }
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2))
  }
  process.exitCode = 1
})
