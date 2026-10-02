import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { PayoutAccountDialog } from './EarningsWallet'
import { apiList } from '../data/apiClient'
import '../styles/trainings.css'
import '../styles/checkout.css'

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(n) || 0)}`
const METHOD_LABEL = { GCASH: 'GCash', MAYA: 'Maya', BANK: 'Bank' }
/// "•••• 4567".
const masked = (n = '') => `•••• ${String(n).replace(/\s/g, '').slice(-4)}`

/// Web port of the app's `RefundDestinationSheet`: pick which saved GCash,
/// Maya or bank account a refund goes to (or add one), then confirm.
/// Calls `onPick(accountId)` — the caller runs the leave/cancel with it.
export default function RefundDestinationDialog({ amount, title, confirmLabel = 'Send refund here', busy = false, onPick, onClose }) {
  const [accounts, setAccounts] = useState(null)
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => apiList('/wallet/me/payout-accounts').then(
    (list) => {
      setAccounts(list)
      setSelected((cur) => cur || (list.find((a) => a.isDefault) || list[0])?.id || '')
    },
    (err) => setError(err.message || 'Could not load your accounts.'),
  ), [])

  useEffect(() => {
    let active = true
    apiList('/wallet/me/payout-accounts').then(
      (list) => {
        if (!active) return
        setAccounts(list)
        setSelected((list.find((a) => a.isDefault) || list[0])?.id || '')
      },
      (err) => { if (active) setError(err.message || 'Could not load your accounts.') },
    )
    return () => { active = false }
  }, [])

  if (adding) {
    return <PayoutAccountDialog onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />
  }

  return (
    <ProfileDialog title="Where should we send it?" onClose={onClose} busy={busy}>
      <div className="co">
        <p className="coach-hint">
          {peso(amount)} from <b>{title}</b> goes back to this account. QR Ph payments can't be reversed automatically — the Versus team sends it, usually within a few days.
        </p>
        {accounts === null ? (
          error ? <p className="tr-error">{error}</p> : <p className="coach-hint">Loading your accounts…</p>
        ) : (
          <div className="co-methods" role="radiogroup" aria-label="Refund account">
            {accounts.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={selected === a.id} className={`tr-pay__option${selected === a.id ? ' is-active' : ''}`} onClick={() => setSelected(a.id)}>
                <Wallet size={22} />
                <span>
                  <b>{a.method === 'BANK' ? a.bankName || 'Bank' : METHOD_LABEL[a.method] || a.method} {masked(a.accountNumber)}</b>
                  <small>{a.accountName}{a.isDefault ? ' · default' : ''}</small>
                </span>
              </button>
            ))}
            <button type="button" className="tr-pay__option" onClick={() => setAdding(true)}>
              <Plus size={22} />
              <span><b>Add an account</b><small>GCash, Maya or bank</small></span>
            </button>
          </div>
        )}
        <button type="button" className="button button--primary button--full" disabled={busy || !selected} onClick={() => onPick(selected)}>
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </ProfileDialog>
  )
}
