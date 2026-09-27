import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarX, Gift } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { coachApi } from '../data/trainings'

/// Coach incentives (admin-created, `GET /coach/incentives`). Display only —
/// the criteria is free text; nothing tracks progress yet.

const fmtDay = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
const fmtFull = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)

const normalize = (j) => ({
  ...j,
  startsAt: new Date(j.startsAt),
  endsAt: j.endsAt ? new Date(j.endsAt) : null,
  rewardAmount: Number(j.rewardAmount) || 0,
})

/// "500 credits", "₱1,000", "Free court hour", or both.
export function rewardText(i) {
  const amount = i.rewardAmount > 0 ? i.rewardAmount.toLocaleString('en-PH') : ''
  const base = !amount ? '' : i.rewardType === 'CASH' ? `₱${amount}` : i.rewardType === 'CREDITS' ? `${amount} credits` : ''
  return [base, i.rewardLabel].filter(Boolean).join(' · ') || 'Reward'
}

function windowText(i) {
  const now = new Date()
  if (i.startsAt > now) return `Starts ${fmtDay(i.startsAt)}`
  if (!i.endsAt) return 'No end date'
  const days = Math.floor((i.endsAt - now) / 86400000)
  if (days <= 0) return 'Ends today'
  if (days <= 7) return `Ends in ${days} day${days === 1 ? '' : 's'}`
  return `Ends ${fmtDay(i.endsAt)}`
}

/// Loads `{ current, upcoming }`; an older server without the endpoint
/// simply yields empty lists.
export function useCoachIncentives() {
  const [state, setState] = useState({ current: [], upcoming: [], loaded: false })
  useEffect(() => {
    let active = true
    coachApi.incentives()
      .then((d) => {
        if (!active) return
        setState({
          current: (d?.current || []).map(normalize),
          upcoming: (d?.upcoming || []).map(normalize),
          loaded: true,
        })
      })
      .catch(() => { if (active) setState((s) => ({ ...s, loaded: true })) })
    return () => { active = false }
  }, [])
  return state
}

/// "Incentives for you" strip for the coach Sessions tab. Renders nothing
/// when there are none.
export function CoachIncentivesStrip() {
  const { current, upcoming } = useCoachIncentives()
  const [open, setOpen] = useState(null)
  const [all, setAll] = useState(false)
  if (!current.length && !upcoming.length) return null
  const shown = current.length ? current : upcoming

  return (
    <section className="ci-strip">
      <div className="ci-strip__head">
        <Gift size={18} />
        <h2>{current.length ? 'Incentives for you' : 'Coming up'}</h2>
        <button type="button" className="ew-link" onClick={() => setAll(true)}>View all · {current.length + upcoming.length}</button>
      </div>
      <div className="ci-strip__row">
        {shown.map((i) => <IncentiveCard key={i.id} incentive={i} compact onOpen={() => setOpen(i)} />)}
      </div>
      {open && <IncentiveDialog incentive={open} onClose={() => setOpen(null)} />}
      {all && (
        <ProfileDialog title="Incentives" onClose={() => setAll(false)}>
          {current.length > 0 && <p className="ci-label">Running now</p>}
          <div className="ci-list">{current.map((i) => <IncentiveCard key={i.id} incentive={i} onOpen={() => { setAll(false); setOpen(i) }} />)}</div>
          {upcoming.length > 0 && <p className="ci-label">Coming up</p>}
          <div className="ci-list">{upcoming.map((i) => <IncentiveCard key={i.id} incentive={i} onOpen={() => { setAll(false); setOpen(i) }} />)}</div>
        </ProfileDialog>
      )}
    </section>
  )
}

function IncentiveCard({ incentive: i, compact = false, onOpen }) {
  const upcoming = i.startsAt > new Date()
  return (
    <button type="button" className={`ci-card${upcoming ? ' is-upcoming' : ''}${compact ? ' is-compact' : ''}`} onClick={onOpen}>
      <span className="ci-card__top">
        <span className="ci-card__reward">{rewardText(i)}</span>
        <span className="ci-card__when">{windowText(i)}</span>
      </span>
      <b className="ci-card__title">{i.title}</b>
      {i.criteria && <span className="ci-card__criteria">{i.criteria}</span>}
    </button>
  )
}

function IncentiveDialog({ incentive: i, onClose }) {
  return (
    <ProfileDialog title="Incentive" onClose={onClose}>
      <div className="ci-detail">
        {i.imageUrl && <img className="ci-detail__banner" src={i.imageUrl} alt="" />}
        <h3>{i.title}</h3>
        <div className="ci-detail__reward"><Gift size={20} /><span><small>REWARD</small><b>{rewardText(i)}</b></span></div>
        <p className="ci-detail__row"><CalendarCheck size={16} /> Starts <b>{fmtFull(i.startsAt)}</b></p>
        <p className="ci-detail__row"><CalendarX size={16} /> Ends <b>{i.endsAt ? fmtFull(i.endsAt) : 'No end date'}</b></p>
        {i.description && <p className="ci-detail__desc">{i.description}</p>}
        {i.criteria && (
          <>
            <h4>How to earn it</h4>
            <p className="ci-detail__criteria">{i.criteria}</p>
          </>
        )}
      </div>
    </ProfileDialog>
  )
}
