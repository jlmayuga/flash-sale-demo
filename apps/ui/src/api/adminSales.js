const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
const ADMIN_URL = `${API_URL}/api/admin`

async function request(path, options = {}) {
  const response = await fetch(`${ADMIN_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return null
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(
      body?.message || `Request failed (${response.status})`,
    )
    error.status = response.status
    throw error
  }
  return body
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` })

export async function loginAdmin(username, password) {
  const credentials = window.btoa(`${username}:${password}`)
  return request('/auth', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  })
}

export async function getAdminSales(token) {
  const body = await request('/flash-sales', { headers: bearer(token) })
  return body.sales
}

export async function createAdminSale(token, sale) {
  const body = await request('/flash-sales', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(sale),
  })
  return body.sale
}

export async function updateAdminSale(token, id, sale) {
  const body = await request(`/flash-sales/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: bearer(token),
    body: JSON.stringify(sale),
  })
  return body.sale
}

export function deleteAdminSale(token, id) {
  return request(`/flash-sales/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: bearer(token),
  })
}
