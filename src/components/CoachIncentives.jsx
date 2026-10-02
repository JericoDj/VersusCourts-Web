import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Ban, CalendarCheck, CalendarX, Check, Flag, Gift, Hourglass, UserPlus, Wallet } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { coachApi } from '../data/trainings'

/// Coach incentives (admin-created, `GET /coach/incentives`). Tracked ones
/// (metric TRAINING_JOINERS) carry my live progress against reward tiers;
/// once one ends an admin verifies the result (`result`, `claim`). Port of
/// coach_incentives.dart.

const fmtDay = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
const fmtFull = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)

const normalize = (j) => ({
  ...j,
  startsAt: new Date(j.startsAt),
  endsAt: j.endsAt ? new Date(j.endsAt) : null,
  rewardAmount: Number(j.rewardAmount) || 0,
  tiers: Array.isArray(j.tiers) ? j.tiers : [],
  tracked: j.metric === 'TRAINING_JOINERS',
  perTraining: j.tierScope === 'PER_TRAINING',
  result: j.result || 'IN_PROGRESS',
})

const isEnded = (i) => Boolean(i.endsAt && i.endsAt < new Date())
const isUpcoming = (i) => i.startsAt > new Date()

/// "₱450" or "450 credits".
export const money = (i, amount) => {
  const n = Number(amount || 0).toLocaleString('en-PH')
  return i.rewardType === 'CASH' ? `₱${n}` : `${n} credits`
}

/// The verified amount, else my live total.
const earnedOf = (i) => (i.claim && i.claim.status !== 'PENDING' ? i.claim.amount : i.progress?.earned ?? 0)

/// "500 credits", "₱1,000", "Up to ₱450", "Free court hour", or both.
export function rewardText(i) {
  const amount = i.rewardAmount > 0 ? i.rewardAmount.toLocaleString('en-PH') : ''
  const base = !amount ? '' : i.rewardType === 'CASH' ? `₱${amount}` : i.rewardType === 'CREDITS' ? `${amount} credits` : ''
  const tiered = i.tracked && i.tiers?.length > 1 && base
  return [tiered ? `Up to ${base}` : base, i.rewardLabel].filter(Boolean).join(' · ') || 'Reward'
}

function windowText(i) {
  const now = new Date()
  if (i.startsAt > now) return `Starts ${fmtDay(i.startsAt)}`
  if (!i.endsAt) return 'No end date'
  if (i.endsAt < now) return `Ended ${fmtDay(i.endsAt)}`
  const days = Math.floor((i.endsAt - now) / 86400000)
  if (days <= 0) return 'Ends today'
  if (days <= 7) return `Ends in ${days} day${days === 1 ? '' : 's'}`
  return `Ends ${fmtDay(i.endsAt)}`
}

const RESULT = {
  UPCOMING: { label: 'Upcoming', tone: 'var(--vc-primary)' },
  IN_PROGRESS: { label: 'In progress', tone: 'var(--vc-primary)' },
  VERIFYING: { label: 'Verifying', tone: 'var(--vc-warning, #f59e0b)' },
  NOT_REACHED: { label: 'Not reached', tone: 'var(--vc-text-secondary)' },
  ENDED: { label: 'Ended', tone: 'var(--vc-text-secondary)' },
  VERIFIED: { label: 'Verified', tone: 'var(--vc-success, #16a34a)' },
  REJECTED: { label: 'Not approved', tone: 'var(--vc-danger)' },
  PAID: { label: 'Paid', tone: 'var(--vc-success, #16a34a)' },
}

/// Loads `{ active, upcoming, past }`; an older server without the
/// endpoint simply yields empty lists (and older ones send `current`).
export function useCoachIncentives() {
  const [state, setState] = useState({ active: [], upcoming: [], past: [], loaded: false })
  const reload = useCallback(() => coachApi.incentives()
    .then((d) => setState({
      active: (d?.active || d?.current || []).map(normalize),
      upcoming: (d?.upcoming || []).map(normalize),
      past: (d?.past || []).map(normalize),
      loaded: true,
    }))
    .catch(() => setState((s) => ({ ...s, loaded: true }))), [])
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

/// "Incentives for you" strip for the coach Sessions tab. Renders nothing
/// when there are none.
export function CoachIncentivesStrip() {
  const incentives = useCoachIncentives()
  const { active, upcoming } = incentives
  const [open, setOpen] = useState(null)
  const [all, setAll] = useState(false)
  if (!active.length && !upcoming.length) return null
  const shown = active.length ? active : upcoming

  return (
    <section className="ci-strip">
      <div className="ci-strip__head">
        <Gift size={18} />
        <h2>{active.length ? 'Incentives for you' : 'Coming up'}</h2>
        <button type="button" className="ew-link" onClick={() => setAll(true)}>View all</button>
      </div>
      <div className="ci-strip__row">
        {shown.map((i) => <IncentiveCard key={i.id} incentive={i} compact onOpen={() => setOpen(i)} />)}
      </div>
      {open && <IncentiveDialog incentive={open} onClose={() => setOpen(null)} />}
      {all && <CoachIncentivesDialog incentives={incentives} onClose={() => setAll(false)} />}
    </section>
  )
}

/// Every incentive for me, tabbed Active / Upcoming / Past. Pass
/// `incentives` from a parent's useCoachIncentives, or it loads its own.
export function CoachIncentivesDialog({ incentives, onClose }) {
  const own = useCoachIncentives()
  const data = incentives || own
  const [tab, setTab] = useState('active')
  const [open, setOpen] = useState(null)
  const TABS = [
    ['active', 'Active', 'No active incentives', 'Incentives running now will show up here with your progress.'],
    ['upcoming', 'Upcoming', 'Nothing coming up', 'Scheduled incentives appear here before they start.'],
    ['past', 'Past', 'No past incentives', 'Ended incentives and their verified rewards land here.'],
  ]
  const [, , emptyTitle, emptyBody] = TABS.find(([id]) => id === tab)
  const list = data[tab]

  if (open) return <IncentiveDialog incentive={open} onClose={() => setOpen(null)} />
  return (
    <ProfileDialog title="Incentives" onClose={onClose}>
      <div className="ci-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            {label}{data[id].length ? ` · ${data[id].length}` : ''}
          </button>
        ))}
      </div>
      {!data.loaded ? (
        <p className="ci-empty">Loading…</p>
      ) : list.length === 0 ? (
        <div className="ci-empty">
          <span className="ci-empty__icon"><Gift size={28} /></span>
          <b>{emptyTitle}</b>
          <p>{emptyBody}</p>
        </div>
      ) : (
        <div className="ci-list">{list.map((i) => <IncentiveCard key={i.id} incentive={i} onOpen={() => setOpen(i)} />)}</div>
      )}
    </ProfileDialog>
  )
}

function ResultBadge({ result }) {
  const r = RESULT[result] || RESULT.ENDED
  return <span className="ci-badge" style={{ '--tone': r.tone }}>{r.label}</span>
}

function IncentiveCard({ incentive: i, compact = false, onOpen }) {
  const plain = isUpcoming(i) || isEnded(i)
  return (
    <button type="button" className={`ci-card${plain ? ' is-upcoming' : ''}${compact ? ' is-compact' : ''}`} onClick={onOpen}>
      <span className="ci-card__top">
        <span className="ci-card__reward">{rewardText(i)}</span>
        {isEnded(i) ? <ResultBadge result={i.result} /> : <span className="ci-card__when">{windowText(i)}</span>}
      </span>
      <b className="ci-card__title">{i.title}</b>
      {i.tracked ? (
        <>
          {!isUpcoming(i) && <ProgressBar incentive={i} onGradient={!plain} />}
          <TierChips incentive={i} />
        </>
      ) : i.criteria && <span className="ci-card__criteria">{i.criteria}</span>}
    </button>
  )
}

/// The ladder at a glance: "1 → ₱150" chips, filled once reached.
function TierChips({ incentive: i }) {
  const count = i.progress?.count ?? 0
  return (
    <span className="ci-chips">
      {i.tiers.map((t) => (
        <span key={t.threshold} className={`ci-chip${!i.perTraining && count >= t.threshold ? ' is-reached' : ''}`}>
          {t.threshold} → {money(i, t.amount)}
        </span>
      ))}
    </span>
  )
}

/// Joiner count against the tier ladder, plus "N more for ₱X" / earned.
function ProgressBar({ incentive: i, onGradient = false }) {
  const p = i.progress
  const count = p?.count ?? 0
  const top = i.tiers.at(-1)?.threshold || 1
  let caption = ''
  if (i.perTraining) {
    const first = i.tiers[0]
    if (first) caption = `Each training with ${first.threshold}+ joiner${first.threshold === 1 ? '' : 's'} earns`
  } else if (p?.nextTier) {
    const left = p.nextTier.threshold - count
    caption = `${left} more joiner${left === 1 ? '' : 's'} for ${money(i, p.nextTier.amount)}`
  } else if (count > 0) caption = 'Top tier reached'
  const trainings = p?.trainings?.length ?? 0

  return (
    <span className={`ci-progress${onGradient ? ' on-gradient' : ''}`}>
      <span className="ci-progress__nums">
        <b>{count}</b>
        <small>{i.perTraining ? `joiner${count === 1 ? '' : 's'} · ${trainings} training${trainings === 1 ? '' : 's'}` : `of ${top} joiners`}</small>
        <span className="ci-progress__earned">
          <small>{isEnded(i) ? 'EARNED' : 'EARNED SO FAR'}</small>
          <b>{money(i, earnedOf(i))}</b>
        </span>
      </span>
      {!i.perTraining && (
        <span className="ci-progress__track">
          <span className="ci-progress__fill" style={{ width: `${Math.min(100, (count / top) * 100)}%` }} />
          {i.tiers.map((t) => (
            <span
              key={t.threshold}
              className={`ci-progress__tick${count >= t.threshold ? ' is-reached' : ''}`}
              style={{ left: `${Math.min(100, (t.threshold / top) * 100)}%` }}
            />
          ))}
        </span>
      )}
      {caption && <small className="ci-progress__caption">{caption}</small>}
    </span>
  )
}

function Verdict({ incentive: i }) {
  const map = {
    VERIFYING: [Hourglass, 'Verifying', "Our team is checking your results. You'll get a notification once it's confirmed."],
    VERIFIED: [BadgeCheck, `Verified · ${money(i, earnedOf(i))}`, 'Your reward is confirmed and will be released soon.'],
    PAID: [Wallet, `Paid · ${money(i, earnedOf(i))}`, 'This reward has been paid out.'],
    REJECTED: [Ban, 'Not approved', i.claim?.note || 'Contact support if you think this is a mistake.'],
    NOT_REACHED: [Flag, 'Tier not reached', 'Keep going — new incentives will show up here.'],
  }
  const [Icon, title, body] = map[i.result] || [CalendarX, 'Ended', 'This incentive has ended.']
  return (
    <div className="ci-verdict" style={{ '--tone': (RESULT[i.result] || RESULT.ENDED).tone }}>
      <Icon size={20} />
      <span><b>{title}</b><small>{body}</small></span>
    </div>
  )
}

function IncentiveDialog({ incentive: i, onClose }) {
  const count = i.progress?.count ?? 0
  return (
    <ProfileDialog title="Incentive" onClose={onClose}>
      <div className="ci-detail">
        {i.imageUrl && <img className="ci-detail__banner" src={i.imageUrl} alt="" />}
        <h3>{i.title}</h3>
        <div className="ci-detail__reward"><Gift size={20} /><span><small>REWARD</small><b>{rewardText(i)}</b></span></div>
        {isEnded(i) && <Verdict incentive={i} />}
        {i.tracked && (
          <>
            <h4>{i.perTraining ? 'Rewards per training' : 'Reward tiers'}</h4>
            <p className="ci-detail__hint">
              {i.perTraining
                ? 'Every training you run in this period earns the tier its joiners reach — rewards add up.'
                : 'Count every player who joins your trainings in this period. You earn the highest tier you reach.'}
            </p>
            <div className="ew-card ci-tiers">
              {i.tiers.map((t) => {
                const reached = !i.perTraining && count >= t.threshold
                return (
                  <div key={t.threshold} className={`ci-tier${reached ? ' is-reached' : ''}`}>
                    <span className="ew-icon" style={{ '--tone': reached ? 'var(--vc-success, #16a34a)' : 'var(--vc-accent)' }}>
                      {reached ? <Check size={18} /> : <UserPlus size={18} />}
                    </span>
                    <b>{t.threshold} joiner{t.threshold === 1 ? '' : 's'}</b>
                    <strong>{money(i, t.amount)}</strong>
                  </div>
                )
              })}
            </div>
            {!isUpcoming(i) && <div className="ew-card ci-detail__progress"><ProgressBar incentive={i} /></div>}
          </>
        )}
        <p className="ci-detail__row"><CalendarCheck size={16} /> Starts <b>{fmtFull(i.startsAt)}</b></p>
        <p className="ci-detail__row"><CalendarX size={16} /> Ends <b>{i.endsAt ? fmtFull(i.endsAt) : 'No end date'}</b></p>
        {i.description && <p className="ci-detail__desc">{i.description}</p>}
        {i.criteria && (
          <>
            <h4>How to earn it</h4>
            <p className="ci-detail__criteria">{i.criteria}</p>
          </>
        )}
        {i.tracked && i.progress?.trainings?.length > 0 && (
          <>
            <h4>Trainings counted</h4>
            <ul className="ci-trainings">
              {i.progress.trainings.map((t) => (
                <li key={t.id}>
                  <span><b>{t.title}</b><small>{fmtFull(new Date(t.startTime))}</small></span>
                  <em>
                    {t.joiners} joiner{t.joiners === 1 ? '' : 's'}
                    {i.perTraining && ` · ${t.amount > 0 ? money(i, t.amount) : '—'}`}
                  </em>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </ProfileDialog>
  )
}
