import { useState } from 'react'
import { AlertCircle, Check, Copy, RotateCw, Tag, X } from 'lucide-react'
import { apiList } from '../data/apiClient'
import { useAccountData } from '../pages/ProfileAccountPage'
import QmDialog from './QmDialog'
import '../styles/queue-master.css'
import '../styles/coupons.css'

// "My coupons" — promos Versus made available to you (GET /coupons/mine):
// for everyone, for coaches, or given to you. Copy a code, enter it at
// checkout. Coupon notifications open this. Mirrors the Flutter CouponsScreen.
const loadCoupons = () => apiList('/coupons/mine')

const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
const discountLabel = (c) =>
  c.discountPct > 0 ? `${fmt(c.discountPct)}%` : c.discountAmount > 0 ? `₱${fmt(c.discountAmount)}` : '—'
const shortDate = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(d))

function rulesLabel(c) {
  const parts = [c.scope === 'ALL' ? 'Any purchase' : `For ${c.scopeLabel}`]
  if (c.firstTimeOnly) parts.push('first-timers')
  if (c.perUserLimit === 1) parts.push('once each')
  else if (c.perUserLimit > 1) parts.push(`${c.timesUsed}/${c.perUserLimit} used`)
  if (c.endsAt) parts.push(`until ${shortDate(c.endsAt)}`)
  return parts.join(' · ')
}

function CouponCard({ coupon: c }) {
  const [copied, setCopied] = useState(false)
  const usable = c.status === 'AVAILABLE'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the code is visible to type */
    }
  }
  return (
    <div className={`cp-card${usable ? '' : ' is-inactive'}`}>
      <div className="cp-stub">
        <Tag size={18} />
        <b>{discountLabel(c)}</b>
        <small>OFF</small>
      </div>
      <div className="cp-body">
        <div className="cp-title-row">
          <h3>{c.description?.trim() || `${discountLabel(c)} off`}</h3>
          {c.status === 'USED' && <span className="qm-badge">Used</span>}
          {c.status === 'SOLD_OUT' && <span className="qm-badge qm-badge--red">All claimed</span>}
        </div>
        <p className="cp-rules">{rulesLabel(c)}</p>
        <div className="cp-code-row">
          <code className="cp-code">{c.code}</code>
          {usable && (
            <button type="button" className="cp-copy" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy code'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CouponsDialog({ isOpen, onClose }) {
  const state = useAccountData(loadCoupons)
  const coupons = state.data || []
  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="620px">
      <div className="qm-container">
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">PROMOS</span>
            <h1 className="qm-header-title">My coupons</h1>
            <p className="qm-header-subtitle">Copy a code and enter it at checkout</p>
          </div>
          <button type="button" className="qm-back-btn" onClick={state.reload} aria-label="Refresh" style={{ marginLeft: 'auto' }}>
            <RotateCw size={16} />
          </button>
        </div>

        {state.loading ? (
          <div className="cp-empty">Loading coupons…</div>
        ) : state.error ? (
          <div className="qm-error-box">
            <AlertCircle size={18} />
            <div>
              <p style={{ margin: '0 0 6px' }}>Could not load your coupons.</p>
              <button type="button" className="qm-btn qm-btn--sm qm-btn--outline" onClick={state.reload}>
                Retry
              </button>
            </div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="cp-empty">
            <span className="cp-empty-icon"><Tag size={28} /></span>
            <b>No coupons yet</b>
            <p>Promos from Versus will show up here — we’ll notify you.</p>
          </div>
        ) : (
          <div className="cp-list">
            {coupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
          </div>
        )}
      </div>
    </QmDialog>
  )
}
