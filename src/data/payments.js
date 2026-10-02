import { apiRequest, authToken } from './apiClient'

/// Web port of the Flutter `PaymentProvider`: the PayMongo QR Ph flow runs
/// entirely through our backend's `/paymongo/*` proxy, so the web can show
/// the same scannable QR the app does.
///
///   1. createPaymentIntent  → intent id + client key (amount in pesos)
///   2. tie the intent to what's being paid (queue join, fee settlement, …)
///   3. createQrPhMethod + attachQrPh → QR image (data URI) + expiry
///   4. poll intentStatus until `succeeded`, then call the item's confirm.

/// QR Ph can't charge under ₱20 — below that, cash is the only choice.
export const QRPH_MINIMUM = 20
export const qrphAvailableFor = (pesos) => Number(pesos) >= QRPH_MINIMUM

const post = (path, body) => apiRequest(path, { method: 'POST', body })

export async function createPaymentIntent({ amountPesos, description }) {
  const res = await post('/paymongo/payment-intents', {
    amount: Math.round(amountPesos * 100),
    paymentMethodAllowed: ['qrph'],
    currency: 'PHP',
    captureType: 'automatic',
    statementDescriptor: 'VERSUS COURTS',
    paymentMethodOptions: { card: { request_three_d_secure: 'any' } },
    description,
  })
  return { id: res.data.id, clientKey: res.data.attributes?.client_key || '' }
}

export async function createQrPhMethod(expirySeconds = 300) {
  const res = await post('/paymongo/payment-methods', { type: 'qrph', expirySeconds })
  return res.data.id
}

/// Attaches the QR Ph method; returns the QR image and when it expires.
export async function attachQrPh({ intentId, paymentMethodId, clientKey }) {
  const res = await post(`/paymongo/payment-intents/${encodeURIComponent(intentId)}/attach`, { paymentMethodId, clientKey })
  const attrs = res.data?.attributes || {}
  const raw = attrs.expires_at
  const expiresAt = raw == null ? null : typeof raw === 'number' ? new Date(raw * 1000) : new Date(raw)
  return {
    qrDataUri: attrs.next_action?.code?.image_url || '',
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : new Date(Date.now() + 300_000),
    status: attrs.status || 'awaiting_next_action',
  }
}

/// `awaiting_next_action` | `processing` | `succeeded`.
export async function intentStatus(intentId) {
  const res = await apiRequest(`/paymongo/payment-intents/${encodeURIComponent(intentId)}`)
  return res.data?.attributes?.status || 'awaiting_next_action'
}

/// Previews a coupon against [amountPesos] without redeeming it. With a
/// [scope] (TRAINING, BOOKING, QUEUE, EVENT, HOST_FEE) and a signed-in player,
/// every rule is checked for them — per-person limit, first-timers only, what
/// it applies to.
export async function validateCoupon(code, amountPesos, scope) {
  let res
  if (scope && authToken()) {
    try {
      res = await post('/coupons/check', { code, amount: amountPesos, scope })
    } catch (err) {
      if (err.status !== 404) throw err // older server: plain preview below
    }
  }
  if (!res) res = await post('/coupons/validate', { code, amount: amountPesos })
  return { valid: Boolean(res?.valid), discountAmount: Number(res?.discountAmount) || 0, reason: res?.reason || '' }
}

/// Promos this player can use at a [scope] checkout, biggest first.
export async function couponOffers(scope, amountPesos) {
  if (!scope || !authToken()) return []
  try {
    const res = await apiRequest('/coupons/offers', { query: { scope, amount: amountPesos } })
    return (Array.isArray(res) ? res : []).map((o) => ({
      code: String(o.code || ''),
      description: o.description || '',
      discountAmount: Number(o.discountAmount) || 0,
    }))
  } catch {
    return []
  }
}
