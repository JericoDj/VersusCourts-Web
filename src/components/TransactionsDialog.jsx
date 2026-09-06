import { useState } from 'react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Copy,
  Receipt,
  RotateCw,
  ShieldCheck,
  Ticket,
  Wallet,
  X,
} from 'lucide-react'
import { apiRequest, apiList } from '../data/apiClient'
import { useAccountData } from '../pages/ProfileAccountPage'
import QmDialog from './QmDialog'
import ProfileDialog from './ProfileDialog'
import '../styles/queue-master.css'

const money = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))

function formatTxnType(type = '') {
  switch (type) {
    case 'TOPUP': return 'Wallet top-up'
    case 'WITHDRAWAL': return 'Withdrawal'
    case 'BOOKING': return 'Booking payment'
    case 'QUEUE_FEE': return 'Queue fee'
    case 'EVENT_FEE': return 'Event fee'
    case 'TRAINING_FEE': return 'Training fee'
    case 'REFUND': return 'Refund'
    case 'COMMISSION': return 'Commission'
    case 'PAYOUT': return 'Payout'
    case 'PLATFORM_FEE_SETTLEMENT': return 'Platform fee settlement'
    default: return type ? type.replace(/_/g, ' ') : 'Transaction'
  }
}

function isCreditTxn(type = '') {
  return type === 'TOPUP' || type === 'REFUND'
}

function formatTxnDate(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

const loadWallet = async () => {
  const [wallet, credits, transactions] = await Promise.all([
    apiRequest('/wallet/me').catch(() => ({ queueMasterBalance: 0, currency: 'PHP' })),
    apiRequest('/wallet/queue-payments').catch(() => ({ availableCredits: 0, maxCredits: 0, usedCredits: 0, totalOutstanding: 0, payments: [] })),
    apiList('/wallet/me/transactions').catch(() => []),
  ])
  return { wallet, credits, transactions }
}

export default function TransactionsDialog({ isOpen = true, onClose }) {
  const state = useAccountData(loadWallet)
  const [selected, setSelected] = useState(null)
  const [copiedId, setCopiedId] = useState(false)
  const [feesOpen, setFeesOpen] = useState(false)
  const [filter, setFilter] = useState('ALL') // ALL | CREDITS | DEBITS

  const credits = state.data?.credits || { availableCredits: 0, maxCredits: 0, usedCredits: 0, totalOutstanding: 0, payments: [] }
  const wallet = state.data?.wallet || { queueMasterBalance: 0, currency: 'PHP' }
  const transactions = state.data?.transactions || []

  const available = credits.availableCredits ?? 0
  const maxCredits = credits.maxCredits ?? 0
  const used = credits.usedCredits ?? 0
  const outstanding = Number(credits.totalOutstanding || 0)
  const qmBalance = Number(wallet.queueMasterBalance || 0)
  const currency = wallet.currency || 'PHP'

  const filteredTxns = transactions.filter((t) => {
    if (filter === 'CREDITS') return isCreditTxn(t.type)
    if (filter === 'DEBITS') return !isCreditTxn(t.type)
    return true
  })

  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="680px">
      <div className="qm-container">
        {/* Header */}
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">BILLING & CREDITS</span>
            <h1 className="qm-header-title">Transactions</h1>
            <p className="qm-header-subtitle">Wallet balance, queue credits, and fee settlements</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--blue">
            <Receipt size={38} />
          </div>
          <div className="qm-badge qm-badge--blue" style={{ marginBottom: 12 }}>
            <Wallet size={13} /> {currency} Account
          </div>
          <h2 className="qm-hero-title">
            {qmBalance > 0 ? money(qmBalance) : `${available} Queue Credits`}
          </h2>
          <p className="qm-hero-desc">
            Keep track of all fee settlements, queue host credits, and payment receipts in one place.
          </p>
        </div>

        {state.loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--vc-text-secondary)' }}>
            Loading transactions...
          </div>
        ) : state.error ? (
          <div className="qm-error-box">
            <AlertCircle size={18} />
            <div>
              <p style={{ margin: '0 0 6px' }}>{state.error}</p>
              <button type="button" className="qm-btn qm-btn--sm qm-btn--outline" onClick={state.reload}>
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={state.reload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCw size={14} /> Refresh
              </button>
            </div>

            {/* Queue Credits Card */}
            <div className="qm-card">
              <div className="qm-card-header">
                <div className="qm-card-icon qm-card-icon--blue">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="qm-card-title">Queue Credits</h3>
                  <p className="qm-card-subtitle">{available} of {maxCredits} available to host</p>
                </div>
              </div>
              <div style={{ margin: '14px 0 8px' }}>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${maxCredits ? Math.min(100, Math.round((available / maxCredits) * 100)) : 0}%`,
                      background: 'var(--vc-primary, #0c4dd1)',
                      borderRadius: 9999,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--vc-text-secondary)', margin: 0 }}>
                {used === 0
                  ? 'Every credit allows you to host queues freely.'
                  : `${used} ${used === 1 ? 'credit is' : 'credits are'} tied up in active or unsettled queues.`}
              </p>

              {outstanding > 0 && (
                <div className="qm-error-box" style={{ marginTop: 14 }}>
                  <AlertCircle size={16} />
                  <span>{money(outstanding)} in platform fees to settle.</span>
                </div>
              )}
            </div>

            {/* Queue Master Earnings Card if present */}
            {qmBalance > 0 && (
              <div className="qm-card">
                <div className="qm-card-header">
                  <div className="qm-card-icon qm-card-icon--green">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="qm-card-title">Queue Master Earnings</h3>
                    <p className="qm-card-subtitle">{currency} {qmBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Outstanding Platform Fees Accordion */}
            <div className="qm-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => setFeesOpen((prev) => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="qm-card-icon qm-card-icon--orange">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="qm-card-title" style={{ fontSize: 15 }}>Outstanding Platform Fees</h3>
                    <p className="qm-card-subtitle">
                      {credits.payments?.length
                        ? `${credits.payments.length} pending fee settlement`
                        : 'All platform fees settled'}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  style={{
                    color: 'var(--vc-text-secondary)',
                    transform: feesOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>

              {feesOpen && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  {!credits.payments?.length ? (
                    <p style={{ fontSize: 13.5, color: 'var(--vc-text-secondary)', textAlign: 'center', margin: 0 }}>
                      No outstanding platform fees.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {credits.payments.map((payment) => (
                        <OutstandingPaymentRow key={payment.id} payment={payment} onUpdated={state.reload} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transactions History Section */}
            <div className="qm-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 className="qm-section-title">Payment History</h3>
                {/* Filter Tabs */}
                <div className="qm-tabs-bar" style={{ marginBottom: 0 }}>
                  {['ALL', 'CREDITS', 'DEBITS'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`qm-tab-pill ${filter === f ? 'is-active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="qm-card" style={{ padding: '8px 16px' }}>
                {!filteredTxns.length ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--vc-text-secondary)' }}>
                    <Receipt size={36} style={{ opacity: 0.35, marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 14 }}>No transactions recorded.</p>
                  </div>
                ) : (
                  filteredTxns.map((item) => {
                    const isCredit = isCreditTxn(item.type)
                    return (
                      <div
                        key={item.id}
                        className="qm-detail-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelected(item)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isCredit ? 'rgba(34, 197, 94, 0.12)' : '#f1f5f9',
                              color: isCredit ? '#16a34a' : '#475569',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--vc-text-primary)' }}>
                              {formatTxnType(item.type)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                              {formatTxnDate(item.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              color: isCredit ? '#16a34a' : 'var(--vc-text-primary)',
                            }}
                          >
                            {isCredit ? '+' : '-'}{money(item.amount)}
                          </div>
                          <span
                            className={`qm-badge ${
                              item.status === 'COMPLETED'
                                ? 'qm-badge--green'
                                : item.status === 'PENDING'
                                ? 'qm-badge--amber'
                                : 'qm-badge--red'
                            }`}
                            style={{ fontSize: 10, padding: '2px 7px', marginTop: 2 }}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Transaction Receipt Modal */}
        {selected && (
          <ProfileDialog title="Transaction Details" onClose={() => setSelected(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: isCreditTxn(selected.type) ? '#16a34a' : 'var(--vc-text-primary)' }}>
                  {isCreditTxn(selected.type) ? '+' : '-'}{money(selected.amount)}
                </div>
                <div style={{ fontSize: 14, color: 'var(--vc-text-secondary)', marginTop: 4 }}>
                  {formatTxnType(selected.type)}
                </div>
              </div>

              <div className="qm-card" style={{ padding: '12px 16px' }}>
                <div className="qm-detail-row">
                  <span style={{ color: 'var(--vc-text-secondary)', fontSize: 13 }}>Status</span>
                  <span className="qm-badge qm-badge--green">{selected.status}</span>
                </div>
                <div className="qm-detail-row">
                  <span style={{ color: 'var(--vc-text-secondary)', fontSize: 13 }}>Date & Time</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{formatTxnDate(selected.createdAt)}</span>
                </div>
                <div className="qm-detail-row">
                  <span style={{ color: 'var(--vc-text-secondary)', fontSize: 13 }}>Reference ID</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(selected.id)
                      setCopiedId(true)
                      setTimeout(() => setCopiedId(false), 2000)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--vc-primary, #0c4dd1)',
                      fontFamily: 'monospace',
                    }}
                  >
                    <Copy size={12} />
                    {copiedId ? 'Copied!' : selected.id.slice(0, 10) + '…'}
                  </button>
                </div>
              </div>
            </div>
          </ProfileDialog>
        )}
      </div>
    </QmDialog>
  )
}

function OutstandingPaymentRow({ payment, onUpdated }) {
  const [busy, setBusy] = useState(false)
  const amount = Number(payment.amount || 0)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: '#f8fafc',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{payment.queueTitle || 'Queue'}</div>
        <div style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>{payment.courtName || 'Court fee'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--vc-danger, #dc2626)' }}>
          {money(amount)}
        </span>
        <button
          type="button"
          className="qm-btn qm-btn--sm qm-btn--primary"
          style={{ padding: '5px 12px', fontSize: 12 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await apiRequest(`/wallet/queue-payments/${payment.id}/settle`, { method: 'POST' })
              onUpdated?.()
            } catch (err) {
              alert(err.message || 'Payment settlement failed.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Processing…' : 'Settle'}
        </button>
      </div>
    </div>
  )
}
