import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CheckCircle2, ChevronDown, ChevronRight, Dumbbell, Smartphone, Store, UserRound } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { coachApi } from '../data/trainings'
import '../styles/coach.css'

/// Web port of `mode_switcher.dart`. Coach is one mode for Hosts and
/// coaches: a `QUEUE_MASTER`, anyone staffed as a COACH somewhere
/// (`GET /coach/businesses`), or anyone who already set up a coach identity.
export function useCoachEligibility(roles = []) {
  const [state, setState] = useState({ loaded: false, businesses: [], identity: null })
  useEffect(() => {
    let active = true
    Promise.allSettled([coachApi.businesses(), coachApi.profile()]).then(([b, p]) => {
      if (!active) return
      setState({
        loaded: true,
        businesses: b.status === 'fulfilled' ? b.value : [],
        identity: p.status === 'fulfilled' ? p.value : null,
      })
    })
    return () => { active = false }
  }, [])
  const isHost = roles.includes('QUEUE_MASTER') || roles.includes('COACH')
  return {
    ...state,
    eligible: isHost || state.businesses.length > 0 || Boolean(state.identity),
  }
}

/// "Playing as Player · Switch" banner. Renders nothing for players with no
/// other mode. With `coachName` it is the in-coach-mode variant.
export function ModeSwitcherBar({ roles = [], avatarUrl, coachName }) {
  const inCoach = coachName != null
  const eligibility = useCoachEligibility(roles)
  const [open, setOpen] = useState(false)

  if (!inCoach && (!eligibility.loaded || !eligibility.eligible)) return null

  const also = inCoach ? 'Also: Player' : 'Also: Coach'

  return (
    <>
      <button type="button" className={`mode-bar${inCoach ? ' mode-bar--coach' : ''}`} onClick={() => setOpen(true)}>
        <span className="mode-bar__avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} />}
          <i aria-hidden="true"><ArrowLeftRight size={11} /></i>
        </span>
        <span className="mode-bar__text">
          <small>{inCoach ? 'COACHING AS' : 'PLAYING AS'}</small>
          <b>{inCoach ? coachName || 'Coach' : 'Player'}</b>
          <span>{also}</span>
        </span>
        <span className="mode-bar__cta">Switch <ChevronDown size={16} /></span>
      </button>
      {open && (
        <ModeSwitcherSheet
          inCoachMode={inCoach}
          coachName={coachName ?? eligibility.identity?.name}
          canCoach={inCoach || eligibility.eligible}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function ModeSwitcherSheet({ inCoachMode, coachName, canCoach, onClose }) {
  const navigate = useNavigate()
  const go = (to) => { onClose(); navigate(to) }

  return (
    <ProfileDialog title="Switch mode" onClose={onClose}>
      <div className="mode-list">
        <ModeTile
          icon={UserRound}
          tone="primary"
          title="Player"
          subtitle="Book courts, join queues and trainings."
          selected={!inCoachMode}
          onClick={inCoachMode ? () => go('/app/profile') : undefined}
        />
        {canCoach && (
          <>
            <p className="mode-list__label">COACH / HOST</p>
            <ModeTile
              icon={Dumbbell}
              tone="accent"
              title={coachName || 'Coach'}
              subtitle={coachName ? 'Queues, trainings and your students.' : 'Set up your coach profile to host and coach.'}
              selected={inCoachMode}
              onClick={inCoachMode ? undefined : () => go('/coach')}
            />
          </>
        )}
        <p className="mode-list__label">BUSINESSES</p>
        <ModeTile
          icon={Store}
          tone="green"
          title="Business mode"
          subtitle="Courts, bookings and staff are managed in the Versus Courts app."
          trailing={<span className="mode-tile__tag"><Smartphone size={12} /> App only</span>}
        />
      </div>
    </ProfileDialog>
  )
}

function ModeTile({ icon: Icon, tone, title, subtitle, selected, onClick, trailing }) {
  return (
    <button type="button" className={`mode-tile mode-tile--${tone}${selected ? ' is-selected' : ''}`} onClick={onClick} disabled={!onClick && !selected}>
      <span className="mode-tile__icon"><Icon size={20} /></span>
      <span className="mode-tile__text"><b>{title}</b><small>{subtitle}</small></span>
      {selected ? <CheckCircle2 size={20} className="mode-tile__check" /> : onClick ? <ChevronRight size={18} /> : trailing}
    </button>
  )
}
