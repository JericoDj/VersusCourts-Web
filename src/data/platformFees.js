import { useEffect, useState } from 'react'
import { apiRequest, authToken } from './apiClient'

/// Web port of lib/data/platform_fees.dart: the platform's cut of paid queues
/// and trainings — admin-set (`GET /platform-fees`), with any custom fee for
/// this host/coach applied (`/platform-fees/mine`). A rate of 0 = no fee.
const DEFAULT = { rate: 0.15, minimum: 20 }
let rules = { queue: { ...DEFAULT }, training: { ...DEFAULT } }
let loading = null
const listeners = new Set()

const parse = (json, fallback) => (json && typeof json === 'object'
  ? { rate: Number(json.rate ?? fallback.rate), minimum: Number(json.minimum ?? fallback.minimum) }
  : fallback)

/// Loads once per session (pass `force` after logging in).
export function loadPlatformFees(force = false) {
  if (loading && !force) return loading
  loading = apiRequest(authToken() ? '/platform-fees/mine' : '/platform-fees')
    .then((res) => {
      rules = { queue: parse(res?.queue, rules.queue), training: parse(res?.training, rules.training) }
      listeners.forEach((fn) => fn(rules))
    })
    .catch(() => { /* keep the defaults */ })
  return loading
}

export const feeRules = () => rules

/// "15%" / "12.5%".
export const percentLabel = (rule) => {
  const pct = rule.rate * 100
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
}

/// "15% (min ₱20)" or "no fee".
export const feeLabel = (rule) => (rule.rate <= 0 ? 'no fee' : rule.minimum > 0 ? `${percentLabel(rule)} (min ₱${Math.round(rule.minimum)})` : percentLabel(rule))

/// The fee on [amount] — never under the minimum (unless the rate is 0).
export const feeOn = (amount, rule) => {
  if (!(amount > 0) || rule.rate <= 0) return 0
  return Math.round(Math.max(amount * rule.rate, rule.minimum) * 100) / 100
}

/// Current rules, re-rendering when they load.
export function usePlatformFees() {
  const [current, setCurrent] = useState(rules)
  useEffect(() => {
    listeners.add(setCurrent)
    loadPlatformFees()
    return () => { listeners.delete(setCurrent) }
  }, [])
  return current
}
