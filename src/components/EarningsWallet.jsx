import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Landmark, MoreVertical, Plus, Wallet } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { apiRequest } from '../data/apiClient'
import { usePlayer } from '../context/PlayerContext'

/// Web port of the Flutter `EarningsWalletView` (earnings_wallet_view.dart)
/// over `/wallet/me/*`: withdrawable balance, saved GCash/Maya/bank payout
/// accounts, withdrawal requests and earnings activity. `embedded` shows
/// fewer history rows, as on coach mode's Profile tab.

const METHODS = [
  { id: 'GCASH', label: 'GCash', icon: Wallet, tone: 'var(--vc-primary)' },
  { id: 'MAYA', label: 'Maya', icon: CreditCard, tone: 'var(--vc-success)' },
  { id: 'BANK', label: 'Bank', icon: Landmark, tone: 'var(--vc-accent)' },
]
const methodMeta = (id) => METHODS.find((m) => m.id === String(id || '').toUpperCase()) || METHODS[2]

// ADJUSTMENT: an admin credited (+) or deducted (−) the balance.
const EARNING_TYPES = new Set(['QUEUE_FEE', 'TRAINING_FEE', 'ADJUSTMENT', 'WITHDRAWAL', 'REFUND'])

const money = (v) => {
  const n = Number(v) || 0
  return n % 1 === 0
    ? `₱${n.toLocaleString('en-PH')}`
    : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtDate = (v) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v))
const fmtDateTime = (v) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(v))

const providerLabel = (a) => (String(a.method).toUpperCase() === 'BANK' ? a.bankName || 'Bank' : methodMeta(a.method).label)
const masked = (n = '') => (n.length <= 4 ? n : `•••• ${n.slice(-4)}`)

async function loadWallet() {
  const [summary, withdrawals, activity] = await Promise.all([
    apiRequest('/wallet/me/earnings'),
    apiRequest('/wallet/me/withdrawals'),
    apiRequest('/wallet/me/transactions').catch(() => []),
  ])
  return {
    summary: {
      available: Number(summary?.available) || 0,
      pending: Number(summary?.pending) || 0,
      minWithdrawal: Number(summary?.minWithdrawal ?? 20),
      accounts: Array.isArray(summary?.accounts) ? summary.accounts : [],
    },
    withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
    activity: (Array.isArray(activity) ? activity : [])
      .map((t) => ({ ...t, type: String(t.type || '').toUpperCase() }))
      .filter((t) => EARNING_TYPES.has(t.type)),
  }
}

export default function EarningsWallet({ embedded = false, reloadKey = 0 }) {
  const { setNotice } = usePlayer()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [accountSheet, setAccountSheet] = useState(null) // { existing? }
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [menuFor, setMenuFor] = useState(null)
  const [history, setHistory] = useState(null) // 'withdrawals' | 'activity'

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let active = true
    loadWallet()
      .then((d) => { if (active) { setData(d); setError('') } })
      .catch(() => { if (active) setError('Could not load your wallet.') })
    return () => { active = false }
  }, [version, reloadKey])

  if (!data) {
    return error ? (
      <div className="ew-error"><p>{error}</p><button type="button" className="button button--outline coach-btn" onClick={reload}>Retry</button></div>
    ) : <div className="ew-loading"><span className="club-bridge-spinner" /></div>
  }

  const { summary: s, withdrawals, activity } = data
  const rows = embedded ? 5 : 20
  const canWithdraw = s.available >= s.minWithdrawal

  const startWithdraw = () => {
    if (!s.accounts.length) {
      setNotice('Add a payout account first.')
      setAccountSheet({})
      return
    }
    setWithdrawOpen(true)
  }

  const accountAction = async (account, action) => {
    setMenuFor(null)
    if (action === 'edit') return setAccountSheet({ existing: account })
    try {
      if (action === 'default') {
        await apiRequest(`/wallet/me/payout-accounts/${account.id}`, { method: 'PATCH', body: { isDefault: true } })
      } else if (action === 'remove') {
        if (!window.confirm(`${providerLabel(account)} ${masked(account.accountNumber)} will no longer receive payouts or refunds. Remove it?`)) return
        await apiRequest(`/wallet/me/payout-accounts/${account.id}`, { method: 'DELETE' })
      }
      reload()
    } catch (err) {
      setNotice(err.message || 'Could not update the account.')
    }
  }

  return (
    <div className="ew">
      <section className="ew-balance">
        <div className="ew-balance__top"><small>AVAILABLE TO WITHDRAW</small><Wallet size={20} /></div>
        <b className="ew-balance__amount">{money(s.available)}</b>
        {s.pending > 0 && <span className="ew-balance__pending">{money(s.pending)} being sent</span>}
        <button type="button" className="ew-balance__cta" disabled={!canWithdraw} onClick={startWithdraw}>
          <ArrowUpRight size={18} /> {canWithdraw ? 'Withdraw' : `Withdraw from ${money(s.minWithdrawal)}`}
        </button>
        <p>Earnings from paid queues and trainings land here after the platform fee. Withdrawals are sent within 1–3 business days.</p>
      </section>

      <div className="ew-section-head">
        <h3>Payout accounts</h3>
        {s.accounts.length < 5 && <button type="button" className="ew-link" onClick={() => setAccountSheet({})}><Plus size={16} /> Add</button>}
      </div>
      {s.accounts.length === 0 ? (
        <button type="button" className="ew-card ew-empty-accounts" onClick={() => setAccountSheet({})}>
          <span className="ew-icon" style={{ '--tone': 'var(--vc-accent)' }}><CreditCard size={20} /></span>
          <span className="ew-grow"><b>Add a payout account</b><small>Save your GCash, Maya or bank details to withdraw.</small></span>
        </button>
      ) : (
        <div className="ew-card ew-accounts">
          {s.accounts.map((a) => {
            const meta = methodMeta(a.method)
            const Icon = meta.icon
            return (
              <div key={a.id} className="ew-account">
                <span className="ew-icon" style={{ '--tone': meta.tone }}><Icon size={20} /></span>
                <span className="ew-grow">
                  <b>{providerLabel(a)} · {masked(a.accountNumber)} {a.isDefault && <em className="ew-badge ew-badge--ok">Default</em>}</b>
                  <small>{a.accountName}</small>
                </span>
                <span className="ew-menu">
                  <button type="button" className="tr-icon-btn" aria-label="Account options" aria-expanded={menuFor === a.id} onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}><MoreVertical size={18} /></button>
                  {menuFor === a.id && (
                    <span className="ew-menu__list" role="menu">
                      {!a.isDefault && <button type="button" role="menuitem" onClick={() => accountAction(a, 'default')}>Make default</button>}
                      <button type="button" role="menuitem" onClick={() => accountAction(a, 'edit')}>Edit</button>
                      <button type="button" role="menuitem" className="is-danger" onClick={() => accountAction(a, 'remove')}>Remove</button>
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="ew-section-head">
        <h3>Withdrawals</h3>
        {withdrawals.length > 0 && <button type="button" className="ew-link" onClick={() => setHistory('withdrawals')}>View all · {withdrawals.length}</button>}
      </div>
      {withdrawals.length === 0 ? <p className="ew-quiet">No withdrawals yet.</p> : withdrawals.slice(0, rows).map((w) => <WithdrawalRow key={w.id} w={w} />)}

      {activity.length > 0 && (
        <>
          <div className="ew-section-head">
            <h3>Earnings activity</h3>
            <button type="button" className="ew-link" onClick={() => setHistory('activity')}>View all · {activity.length}</button>
          </div>
          {activity.slice(0, rows).map((t, i) => <ActivityRow key={t.id || i} t={t} />)}
        </>
      )}

      {history && (
        <HistoryDialog
          kind={history}
          items={history === 'withdrawals' ? withdrawals : activity}
          onClose={() => setHistory(null)}
        />
      )}
      {accountSheet && (
        <PayoutAccountDialog
          existing={accountSheet.existing}
          onClose={() => setAccountSheet(null)}
          onSaved={() => { setAccountSheet(null); reload() }}
        />
      )}
      {withdrawOpen && (
        <WithdrawDialog
          summary={s}
          onClose={() => setWithdrawOpen(false)}
          onSent={(amount) => {
            setWithdrawOpen(false)
            setNotice(`${money(amount)} withdrawal requested. We'll notify you once it's sent.`)
            reload()
          }}
        />
      )}
    </div>
  )
}

/// Add / edit a GCash, Maya or bank account (`PayoutAccountSheet`).
export function PayoutAccountDialog({ existing, onClose, onSaved }) {
  const [method, setMethod] = useState(String(existing?.method || 'GCASH').toUpperCase())
  const [bankName, setBankName] = useState(existing?.bankName || '')
  const [accountName, setAccountName] = useState(existing?.accountName || '')
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber || '')
  const [makeDefault, setMakeDefault] = useState(Boolean(existing?.isDefault))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isBank = method === 'BANK'

  const numberProblem = () => {
    const n = accountNumber.replace(/[\s-]/g, '')
    if (isBank) return /^\d{6,20}$/.test(n) ? '' : 'Account number must be 6–20 digits.'
    const local = /^\+?63\d{10}$/.test(n) ? `0${n.slice(-10)}` : n
    return /^09\d{9}$/.test(local) ? '' : 'Use an 11-digit number, e.g. 09171234567.'
  }

  const save = async (e) => {
    e.preventDefault()
    if (isBank && !bankName.trim()) return setError('Enter the bank name.')
    if (accountName.trim().length < 2) return setError('Enter the account holder name.')
    const problem = numberProblem()
    if (problem) return setError(problem)
    setSaving(true)
    setError('')
    try {
      if (!existing) {
        await apiRequest('/wallet/me/payout-accounts', {
          method: 'POST',
          body: { method, ...(isBank ? { bankName: bankName.trim() } : {}), accountName: accountName.trim(), accountNumber: accountNumber.trim(), isDefault: makeDefault },
        })
      } else {
        await apiRequest(`/wallet/me/payout-accounts/${existing.id}`, {
          method: 'PATCH',
          body: {
            method,
            ...(isBank ? { bankName: bankName.trim() } : {}),
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            ...(makeDefault && !existing.isDefault ? { isDefault: true } : {}),
          },
        })
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Could not save the account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileDialog title={existing ? 'Edit payout account' : 'Add payout account'} onClose={onClose} busy={saving}>
      <form className="ew-form" onSubmit={save}>
        <p className="coach-hint">Payouts and refunds are sent here. Make sure the name matches the account.</p>
        <div className="ew-methods" role="radiogroup" aria-label="Payout method">
          {METHODS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={method === m.id ? 'is-active' : ''} style={{ '--tone': m.tone }} disabled={saving} onClick={() => setMethod(m.id)}>
              <m.icon size={18} /> {m.label}
            </button>
          ))}
        </div>
        {isBank && (
          <label className="tr-field"><span>Bank</span><input className="tr-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. BPI, BDO, UnionBank" disabled={saving} /></label>
        )}
        <label className="tr-field"><span>Account name</span><input className="tr-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Name on the account" disabled={saving} /></label>
        <label className="tr-field">
          <span>{isBank ? 'Account number' : `${methodMeta(method).label} number`}</span>
          <input className="tr-input" inputMode="tel" maxLength={24} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9+\s-]/g, ''))} placeholder={isBank ? '' : '09XX XXX XXXX'} disabled={saving} />
        </label>
        {!existing?.isDefault && (
          <label className="ew-toggle"><input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} disabled={saving} /> Use as default</label>
        )}
        {error && <p className="tr-error">{error}</p>}
        <button type="submit" className="button button--primary button--full coach-btn" disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button>
      </form>
    </ProfileDialog>
  )
}

/// Request a withdrawal to a saved account (`_WithdrawSheet`).
function WithdrawDialog({ summary: s, onClose, onSent }) {
  const [amount, setAmount] = useState(String(Math.floor(s.available)))
  const [accountId, setAccountId] = useState((s.accounts.find((a) => a.isDefault) || s.accounts[0])?.id)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const quick = [500, 1000, 2000].filter((v) => v >= s.minWithdrawal && v < s.available)

  const send = async (e) => {
    e.preventDefault()
    const a = Number.parseFloat(amount)
    if (!Number.isFinite(a)) return setError('Enter an amount.')
    if (a < s.minWithdrawal) return setError(`Minimum is ${money(s.minWithdrawal)}.`)
    if (a > s.available) return setError(`You only have ${money(s.available)}.`)
    setSending(true)
    setError('')
    try {
      await apiRequest('/wallet/me/withdraw', { method: 'POST', body: { amount: a, payoutAccountId: accountId } })
      onSent(a)
    } catch (err) {
      setError(err.message || 'Could not request the withdrawal.')
    } finally {
      setSending(false)
    }
  }

  return (
    <ProfileDialog title="Withdraw" onClose={onClose} busy={sending}>
      <form className="ew-form" onSubmit={send}>
        <p className="coach-hint">Available: {money(s.available)}</p>
        <label className="tr-field"><span>Amount (₱)</span><input className="tr-input" type="number" min={s.minWithdrawal} max={s.available} step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} disabled={sending} /></label>
        <div className="ew-quick">
          {quick.map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))}>{money(v)}</button>)}
          <button type="button" onClick={() => setAmount(String(s.available))}>All</button>
        </div>
        <p className="ew-form__label">Send to</p>
        <div className="ew-card ew-accounts">
          {s.accounts.map((a) => (
            <label key={a.id} className="ew-account ew-account--pick">
              <input type="radio" name="payout-account" checked={accountId === a.id} onChange={() => setAccountId(a.id)} disabled={sending} />
              <span className="ew-grow"><b>{providerLabel(a)} · {masked(a.accountNumber)}</b><small>{a.accountName}</small></span>
            </label>
          ))}
        </div>
        {error && <p className="tr-error">{error}</p>}
        <button type="submit" className="button button--primary button--full coach-btn" disabled={sending || !accountId}>{sending ? 'Requesting…' : 'Request withdrawal'}</button>
      </form>
    </ProfileDialog>
  )
}

function WithdrawalRow({ w }) {
  const status = String(w.status || '').toUpperCase()
  const [label, cls] = status === 'PAID' ? ['Sent', 'ok'] : status === 'REJECTED' ? ['Declined', 'danger'] : ['Processing', 'warn']
  const detail = [w.destination, w.createdAt && fmtDate(w.createdAt), w.reference && (status === 'REJECTED' ? w.reference : `Ref ${w.reference}`)].filter(Boolean).join(' · ')
  return (
    <div className="ew-card ew-withdrawal">
      <span className="ew-grow"><b>{money(w.amount)}</b><small>{detail}</small></span>
      <em className={`ew-badge ew-badge--${cls}`}>{label}</em>
    </div>
  )
}

function ActivityRow({ t }) {
  const credit = t.type === 'ADJUSTMENT' ? Number(t.amount) >= 0 : t.type !== 'WITHDRAWAL'
  return (
    <div className={`ew-activity${credit ? ' is-credit' : ''}`}>
      {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      <span className="ew-grow"><b>{t.description}</b><small>{t.createdAt && fmtDateTime(t.createdAt)}</small></span>
      <strong>{credit ? '+' : '−'}{money(Math.abs(Number(t.amount) || 0))}</strong>
    </div>
  )
}

const PAGE_SIZE = 10

/// Page numbers with ellipses: 1 … 4 5 6 … 12.
function pageList(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`)
    out.push(p)
  })
  return out
}

/// "View all" — every withdrawal or earnings line, PAGE_SIZE per page. The
/// API returns the full list, so pages are cut client-side.
function HistoryDialog({ kind, items, onClose }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const slice = items.slice(start, start + PAGE_SIZE)
  const isWithdrawals = kind === 'withdrawals'

  return (
    <ProfileDialog title={isWithdrawals ? 'Withdrawals' : 'Earnings activity'} onClose={onClose}>
      <p className="coach-hint">
        {items.length ? `Showing ${start + 1}–${start + slice.length} of ${items.length}` : 'Nothing here yet.'}
      </p>
      <div className="ew ew-history">
        {slice.map((item, i) => (isWithdrawals
          ? <WithdrawalRow key={item.id || start + i} w={item} />
          : <ActivityRow key={item.id || start + i} t={item} />))}
      </div>
      {pages > 1 && (
        <nav className="ew-pager" aria-label="Pages">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Prev</button>
          {pageList(current, pages).map((p) => (typeof p === 'string'
            ? <span key={p} className="ew-pager__gap">…</span>
            : <button key={p} type="button" className={p === current ? 'is-active' : ''} aria-current={p === current ? 'page' : undefined} onClick={() => setPage(p)}>{p}</button>))}
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
        </nav>
      )}
    </ProfileDialog>
  )
}
