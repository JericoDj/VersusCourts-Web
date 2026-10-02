import { useCallback, useEffect, useRef, useState } from 'react'
import { Banknote, CheckCircle2, Clock, MapPin, QrCode, RotateCw, Tag } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import {
  QRPH_MINIMUM,
  attachQrPh,
  createPaymentIntent,
  createQrPhMethod,
  intentStatus,
  qrphAvailableFor,
  couponOffers,
  validateCoupon,
} from '../data/payments'
import '../styles/trainings.css'
import '../styles/checkout.css'

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(n) || 0)}`
const POLL_MS = 3000

/// Web port of the app's `OrderDetailsScreen` + `QrPaymentScreen`: review
/// what's being paid, optionally apply a coupon, then pay by Cash (if the
/// item allows it) or QR Ph — a live PayMongo QR with a countdown that
/// confirms itself once the payment lands.
///
/// The caller wires what the payment is for:
///   onSubmitQr(intentId, clientKey, couponCode) — create the join/booking tied to the intent
///   onConfirmQr()  — the item's confirm call once PayMongo says succeeded
///   onCancelQr()   — back out of a QR that wasn't paid (optional)
///   onSubmitCash(couponCode) — optional; omit to offer QR only
///   onSubmitFree(couponCode) — when a coupon brings the total to ₱0
///   onDone(method) — closes the flow after success ('QRPH' | 'CASH')
export default function CheckoutDialog({
  title = 'Checkout',
  itemTitle,
  venueLabel,
  timeLabel,
  amount,
  priceLabel = 'Price',
  purposeLabel,
  allowCoupon = true,
  /// What's being paid for (TRAINING, QUEUE, …): coupons are checked with
  /// every rule for this player, and eligible promos are offered.
  couponScope,
  cashNote = 'Pay in person — the host confirms it.',
  successMessage = 'Payment received!',
  onSubmitQr,
  onConfirmQr,
  onCancelQr,
  onSubmitCash,
  onSubmitFree,
  onDone,
  onClose,
}) {
  const [step, setStep] = useState('review') // review | qr | success
  const [method, setMethod] = useState(onSubmitCash && !qrphAvailableFor(amount) ? 'CASH' : 'QRPH')
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, discount }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The best promo this player can use here (auto-offer coupons).
  const [offer, setOffer] = useState(null)
  useEffect(() => {
    if (!allowCoupon || !couponScope) return undefined
    let active = true
    couponOffers(couponScope, amount).then((list) => { if (active && list.length) setOffer(list[0]) })
    return () => { active = false }
  }, [allowCoupon, couponScope, amount])

  const discount = coupon?.discount || 0
  const payable = Math.max(0, amount - discount)
  const qrOk = qrphAvailableFor(payable)
  const useCash = Boolean(onSubmitCash) && (method === 'CASH' || !qrOk)

  // QR state
  const [intent, setIntent] = useState(null)
  const [qr, setQr] = useState(null) // { qrDataUri, expiresAt }
  const [qrState, setQrState] = useState('loading') // loading | ready | expired | confirming | error
  const [remaining, setRemaining] = useState(0)
  const pollRef = useRef(null)
  const tickRef = useRef(null)
  const confirmingRef = useRef(false)
  const paidRef = useRef(false)

  const stopTimers = () => {
    clearInterval(pollRef.current)
    clearInterval(tickRef.current)
  }
  useEffect(() => stopTimers, [])

  const applyCoupon = async (preset) => {
    const c = (typeof preset === 'string' ? preset : code).trim().toUpperCase()
    if (!c) return
    setBusy(true)
    setError('')
    try {
      const res = await validateCoupon(c, amount, couponScope)
      if (res.valid) setCoupon({ code: c, discount: res.discountAmount })
      else setError(res.reason || 'That coupon code is not valid.')
    } catch (err) {
      setError(err.message || 'Could not check that coupon code.')
    } finally {
      setBusy(false)
    }
  }

  const succeed = useCallback(async (activeIntent) => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    stopTimers()
    setQrState('confirming')
    try {
      await onConfirmQr?.(activeIntent)
      paidRef.current = true
      setStep('success')
    } catch (err) {
      setQrState('error')
      setError(err.message || 'Payment received, but confirming it failed. Refresh in a moment or contact support.')
    } finally {
      confirmingRef.current = false
    }
  }, [onConfirmQr])

  const showQr = useCallback(async (activeIntent) => {
    stopTimers()
    setQrState('loading')
    setError('')
    try {
      const pm = await createQrPhMethod(300)
      const att = await attachQrPh({ intentId: activeIntent.id, paymentMethodId: pm, clientKey: activeIntent.clientKey })
      if (!att.qrDataUri) throw new Error('missing QR')
      setQr(att)
      setQrState('ready')
      if (att.status === 'succeeded') return succeed(activeIntent)
      const tick = () => {
        const left = Math.max(0, Math.round((att.expiresAt - Date.now()) / 1000))
        setRemaining(left)
        if (left <= 0) { stopTimers(); setQrState('expired') }
      }
      tick()
      tickRef.current = setInterval(tick, 1000)
      pollRef.current = setInterval(async () => {
        try {
          if ((await intentStatus(activeIntent.id)) === 'succeeded') succeed(activeIntent)
        } catch {
          // A failed poll isn't fatal — the next tick retries.
        }
      }, POLL_MS)
    } catch {
      setQrState('error')
      setError('Could not generate a QR code. Please try again.')
    }
  }, [succeed])

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      if (payable <= 0) {
        await onSubmitFree(coupon?.code || undefined)
        paidRef.current = true
        onDone?.('FREE')
        return
      }
      if (useCash) {
        await onSubmitCash(coupon?.code || undefined)
        paidRef.current = true
        onDone?.('CASH')
        return
      }
      const created = await createPaymentIntent({ amountPesos: payable, description: purposeLabel || itemTitle })
      await onSubmitQr(created.id, created.clientKey, coupon?.code || undefined)
      setIntent(created)
      setStep('qr')
      showQr(created)
    } catch (err) {
      setError(err.message || 'Could not start the payment. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  /// Leaving an unpaid QR backs the item out (e.g. frees the queue slot).
  const close = async () => {
    stopTimers()
    if (step === 'qr' && !paidRef.current && onCancelQr) {
      try { await onCancelQr() } catch { /* best effort */ }
    }
    if (step === 'success') onDone?.('QRPH')
    else onClose?.()
  }

  const mm = String(Math.floor(remaining / 60))
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <ProfileDialog title={step === 'qr' ? 'Scan to pay' : step === 'success' ? 'Paid' : title} onClose={close} busy={busy || qrState === 'confirming'}>
      {step === 'review' && (
        <div className="co">
          <div className="co-item">
            <b>{itemTitle}</b>
            {venueLabel && <small><MapPin size={13} /> {venueLabel}</small>}
            {timeLabel && <small><Clock size={13} /> {timeLabel}</small>}
          </div>

          {allowCoupon && offer && !coupon && (
            <div className="co-offer">
              <Tag size={18} />
              <span>
                <b>{offer.description || `${peso(offer.discountAmount)} off with ${offer.code}`}</b>
                <small>Save {peso(offer.discountAmount)} on this checkout</small>
              </span>
              <button type="button" className="button button--primary" disabled={busy} onClick={() => { setCode(offer.code); applyCoupon(offer.code) }}>Apply</button>
            </div>
          )}
          {allowCoupon && (
            <div className="co-coupon">
              {coupon ? (
                <div className="co-coupon__applied">
                  <Tag size={15} /> <b>{coupon.code}</b> applied
                  <button type="button" className="coach-link-btn" onClick={() => { setCoupon(null); setCode('') }}>Remove</button>
                </div>
              ) : (
                <div className="co-coupon__row">
                  <input className="tr-input" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && applyCoupon()} />
                  <button type="button" className="button button--outline" disabled={busy || !code.trim()} onClick={applyCoupon}>Apply</button>
                </div>
              )}
            </div>
          )}

          <dl className="co-price">
            <div><dt>{priceLabel}</dt><dd>{peso(amount)}</dd></div>
            {discount > 0 && <div className="is-discount"><dt>Promo · {coupon.code}</dt><dd>−{peso(discount)}</dd></div>}
            <div className="is-total"><dt>Total</dt><dd>{payable > 0 ? peso(payable) : 'Free'}</dd></div>
          </dl>

          {payable > 0 && (
            <div className="co-methods" role="radiogroup" aria-label="Payment method">
              <button type="button" role="radio" aria-checked={!useCash} className={`tr-pay__option${!useCash ? ' is-active' : ''}`} disabled={!qrOk} onClick={() => setMethod('QRPH')}>
                <QrCode size={22} />
                <span><b>QR Ph (GCash, Maya, banks)</b><small>{qrOk ? 'Scan the QR with any banking or e-wallet app.' : `Available for totals of ₱${QRPH_MINIMUM} and up — pay with cash instead.`}</small></span>
              </button>
              {onSubmitCash && (
                <button type="button" role="radio" aria-checked={useCash} className={`tr-pay__option${useCash ? ' is-active' : ''}`} onClick={() => setMethod('CASH')}>
                  <Banknote size={22} />
                  <span><b>Cash</b><small>{cashNote}</small></span>
                </button>
              )}
            </div>
          )}

          {error && <p className="tr-error">{error}</p>}
          <button type="button" className="button button--primary button--full" disabled={busy || (!useCash && payable > 0 && !qrOk)} onClick={pay}>
            {busy ? 'Please wait…' : payable <= 0 ? 'Confirm' : useCash ? `Confirm · pay ${peso(payable)} in cash` : `Pay ${peso(payable)} with QR Ph`}
          </button>
        </div>
      )}

      {step === 'qr' && (
        <div className="co co-qr">
          <p className="co-qr__amount">{peso(payable)}<small>{purposeLabel || itemTitle}</small></p>
          <div className="co-qr__frame">
            {qrState === 'loading' && <span className="club-bridge-spinner" />}
            {(qrState === 'ready' || qrState === 'confirming') && qr && <img src={qr.qrDataUri} alt="QR Ph code to scan" />}
            {qrState === 'expired' && <p>This QR expired.</p>}
            {qrState === 'error' && <p>{error || 'Something went wrong.'}</p>}
          </div>
          {qrState === 'ready' && <p className="co-qr__hint">Scan with GCash, Maya or your bank app · expires in {mm}:{ss}<br />This page updates by itself once you've paid.</p>}
          {qrState === 'confirming' && <p className="co-qr__hint">Payment received — confirming…</p>}
          {(qrState === 'expired' || (qrState === 'error' && intent)) && (
            <button type="button" className="button button--primary button--full" onClick={() => showQr(intent)}><RotateCw size={16} /> New QR code</button>
          )}
          {qrState === 'ready' && (
            <button type="button" className="button button--outline button--full" onClick={async () => {
              try { if ((await intentStatus(intent.id)) === 'succeeded') succeed(intent); else setError("We haven't received the payment yet.") } catch { setError('Could not check the payment.') }
            }}>I've paid</button>
          )}
          {qrState === 'ready' && error && <p className="tr-error">{error}</p>}
        </div>
      )}

      {step === 'success' && (
        <div className="co co-success">
          <CheckCircle2 size={48} />
          <b>{successMessage}</b>
          <button type="button" className="button button--primary button--full" onClick={() => onDone?.('QRPH')}>Done</button>
        </div>
      )}
    </ProfileDialog>
  )
}
