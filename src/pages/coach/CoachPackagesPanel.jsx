import { useCallback, useEffect, useState } from 'react'
import { Ticket } from 'lucide-react'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { PACKAGE_STATUS, coachApi, formatSessionTime, packageSizeLabel } from '../../data/trainings'

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))}`
const rank = (p) => (p.status === 'PENDING' ? 0 : p.isOpen ? 1 : 2)

/// Web port of the app's `CoachPackagesPanel`: a training's packages on
/// sale, requests to accept or decline (bookable listings, or cash), and
/// every buyer's balance — with "Give more time" for active ones.
export default function CoachPackagesPanel({ training: t, onChanged }) {
  const { act } = useCoach()
  const { setNotice } = usePlayer()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null) // { id, kind: 'accept' | 'decline' | 'extend' }
  const [text, setText] = useState('')

  const load = useCallback(() => coachApi.packages(t.id).then(
    (res) => { setData({ ...res, purchases: [...res.purchases].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt) }); setError('') },
    (err) => setError(err.message || 'Could not load packages.'),
  ), [t.id])

  useEffect(() => {
    let active = true
    coachApi.packages(t.id).then(
      (res) => { if (active) setData({ ...res, purchases: [...res.purchases].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt) }) },
      (err) => { if (active) setError(err.message || 'Could not load packages.') },
    )
    return () => { active = false }
  }, [t.id])

  const run = async (fn, message) => {
    setBusy(true)
    setError('')
    try {
      await act(fn)
      await load()
      onChanged?.()
      setMode(null)
      setText('')
      setNotice(message)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!data) return error ? <p className="tr-error">{error} <button type="button" className="coach-link-btn" onClick={load}>Retry</button></p> : <p className="coach-hint">Loading packages…</p>

  return (
    <div className="coach-packages">
      {data.packages.length ? (
        <div className="coach-packages__offers">
          {data.packages.map((o) => (
            <span key={o.id} className="tr-pill tr-pill--primary">{packageSizeLabel(o, t.durationHours)} · {peso(o.price)}</span>
          ))}
        </div>
      ) : <p className="coach-hint">No packages on sale — add some by editing the training.</p>}
      {error && <p className="tr-error">{error}</p>}

      {data.purchases.length ? data.purchases.map((p) => (
        <div key={p.id} className={`tr-booking${p.isOpen ? '' : ' is-closed'}`}>
          <div className="tr-booking__head">
            <span className="coach-student">
              <span className="coach-face">{p.playerAvatarUrl ? <img src={p.playerAvatarUrl} alt="" /> : p.playerName[0]}</span>
              <span className="coach-student__name">{p.playerName}<small>{p.sessionsTotal} sessions{p.players > 1 ? ` · group of ${p.players}` : ''} · {p.amountPaid ? `${peso(p.amountPaid)} ${p.paysCash ? 'cash' : 'QR Ph'}` : 'Free'}</small></span>
            </span>
            <span className={`tr-pill tr-pill--${PACKAGE_STATUS[p.status].tone}`}>{PACKAGE_STATUS[p.status].label}</span>
          </div>
          <small><Ticket size={12} /> {p.sessionsLeft} of {p.sessionsTotal} left · {p.sessionsDone} done{p.expiresAt ? ` · until ${p.expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small>
          {p.upcoming.slice(0, 4).map((x) => <small key={x.id}>• {formatSessionTime(x.start)}{x.isPending ? ' (requested)' : ''}</small>)}
          {p.upcoming.length > 4 && <small>+{p.upcoming.length - 4} more</small>}
          {p.note && <span className="tr-booking__note">“{p.note}”</span>}

          {mode?.id === p.id ? (
            <div className="tr-confirm">
              {mode.kind === 'accept' && (
                <>
                  <p>{p.paysCash && p.amountPaid ? `${p.playerName} pays ${peso(p.amountPaid)} in cash — accept once you have it (or will collect it). ` : ''}Their picked sessions are confirmed{p.isSeries ? '' : ' at the times they asked for'}; sessions added later come to you one by one.</p>
                  <div className="tr-confirm__row">
                    <button type="button" className="button button--outline" onClick={() => setMode(null)}>Back</button>
                    <button type="button" className="button button--primary" disabled={busy} onClick={() => run(() => coachApi.acceptPackage(p.id), `Package accepted — ${p.playerName} was told.`)}>Accept</button>
                  </div>
                </>
              )}
              {mode.kind === 'decline' && (
                <>
                  <p>{p.paysCash ? `${p.playerName} will be told.` : `${p.playerName} is refunded what they paid by QR.`}</p>
                  <textarea className="tr-input" rows={2} maxLength={300} placeholder="Reason (optional)" value={text} onChange={(e) => setText(e.target.value)} />
                  <div className="tr-confirm__row">
                    <button type="button" className="button button--outline" onClick={() => setMode(null)}>Back</button>
                    <button type="button" className="button pf-button--danger" disabled={busy} onClick={() => run(() => coachApi.declinePackage(p.id, text), 'Package declined.')}>Decline</button>
                  </div>
                </>
              )}
              {mode.kind === 'extend' && (
                <div className="tr-confirm__row">
                  {[7, 14, 30, 60].map((d) => (
                    <button key={d} type="button" className="button button--outline" disabled={busy} onClick={() => run(() => coachApi.extendPackage(p.id, d), `Extended by ${d} days.`)}>+{d} days</button>
                  ))}
                  <button type="button" className="coach-link-btn" onClick={() => setMode(null)}>Back</button>
                </div>
              )}
            </div>
          ) : (
            <div className="tr-confirm__row">
              {p.status === 'PENDING' && (
                <>
                  <button type="button" className="button button--primary" disabled={busy} onClick={() => setMode({ id: p.id, kind: 'accept' })}>Accept</button>
                  <button type="button" className="button button--outline coach-btn--danger" disabled={busy} onClick={() => setMode({ id: p.id, kind: 'decline' })}>Decline</button>
                </>
              )}
              {p.status === 'ACTIVE' && (
                <button type="button" className="button button--outline" disabled={busy} onClick={() => setMode({ id: p.id, kind: 'extend' })}>Give more time</button>
              )}
            </div>
          )}
        </div>
      )) : <p className="coach-hint">No one has bought a package yet.</p>}
    </div>
  )
}
