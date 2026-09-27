import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Dumbbell, Plus, Shield, UserRound, UsersRound } from 'lucide-react'
import CreateQueueModal from '../../components/CreateQueueModal'
import ProfileDialog from '../../components/ProfileDialog'
import { CoachProvider, useCoach } from '../../context/CoachContext'
import { useDiscovery } from '../../context/DiscoveryContext'
import { setActingAsCoach } from '../../data/apiClient'
import CoachIdentityForm from './CoachIdentityForm'
import '../../styles/coach.css'
import '../../styles/trainings.css'

/// Coach mode — web port of `CoachModeScreen` (Flutter route `/host`): the
/// one mode for Hosts and coaches, worked under a coach identity. Nav:
/// Sessions · Trainings · (+) Create · Clubs · Profile, where Create opens a
/// choice sheet (queue or training). There is no shared app bar — each tab
/// draws its own `CoachHeader`. The first visit runs the identity setup.
export default function CoachShell() {
  const { refresh: refreshDiscovery } = useDiscovery()

  // From here on, club actions belong to the coach identity (X-Acting-As),
  // so "my clubs" is reloaded as the coach's — and as the player's on exit.
  useEffect(() => {
    setActingAsCoach(true)
    refreshDiscovery()
    return () => {
      setActingAsCoach(false)
      refreshDiscovery()
    }
    // Only on entering/leaving coach mode, not on every discovery change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <CoachProvider>
      <CoachGate />
    </CoachProvider>
  )
}

function CoachGate() {
  const { identity, identityLoaded } = useCoach()
  const navigate = useNavigate()

  if (!identityLoaded) {
    return <div className="coach-loading"><span className="club-bridge-spinner" /></div>
  }
  if (!identity) {
    return (
      <div className="coach-setup">
        <button type="button" className="coach-back" onClick={() => navigate('/app/profile')}><ArrowLeft size={18} /> Back to Player</button>
        <CoachIdentityForm setup />
      </div>
    )
  }
  return <CoachLayout />
}

const NAV = [
  { to: '/coach', label: 'Sessions', icon: UsersRound, end: true },
  { to: '/coach/trainings', label: 'Trainings', icon: Dumbbell },
  { create: true, label: 'Create' },
  { to: '/coach/clubs', label: 'Clubs', icon: Shield },
  { to: '/coach/profile', label: 'Profile', icon: UserRound },
]

function CoachLayout() {
  const { identity } = useCoach()
  const location = useLocation()
  const navigate = useNavigate()
  const [choiceOpen, setChoiceOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  /// Bumped after a queue is created so Sessions refetches its list.
  const [queuesVersion, setQueuesVersion] = useState(0)

  const pick = (what) => {
    setChoiceOpen(false)
    if (what === 'queue') setQueueOpen(true)
    else navigate('/coach/trainings/new')
  }

  return (
    <div className="coach-shell">
      <main className="coach-main">
        <div className="container" key={location.pathname}><Outlet context={{ queuesVersion }} /></div>
      </main>

      <nav className="coach-nav" aria-label="Coach navigation">
        {NAV.map(({ to, label, icon: Icon, end, create }) => (create ? (
          <button key="create" type="button" className="coach-nav__item coach-nav__item--create" onClick={() => setChoiceOpen(true)} aria-haspopup="dialog">
            <span className="coach-nav__plus" aria-hidden="true"><Plus size={24} /></span>
            <span>{label}</span>
          </button>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={end}
            // Trainings stays lit on a training's detail/edit/new pages.
            className={({ isActive }) => `coach-nav__item${isActive ? ' is-active' : ''}`}
          >
            {to === '/coach/profile' && identity.avatarUrl
              ? <img className="coach-nav__avatar" src={identity.avatarUrl} alt="" />
              : <Icon size={22} />}
            <span>{label}</span>
          </NavLink>
        )))}
      </nav>

      {choiceOpen && <CreateChoiceSheet onPick={pick} onClose={() => setChoiceOpen(false)} />}
      <CreateQueueModal
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        onCreated={() => {
          setQueueOpen(false)
          setQueuesVersion((v) => v + 1)
          navigate('/coach')
        }}
      />
    </div>
  )
}

/// What to create — port of `CreateChoiceSheet` (create_choice_sheet.dart).
function CreateChoiceSheet({ onPick, onClose }) {
  return (
    <ProfileDialog title="Create" onClose={onClose}>
      <div className="mode-list">
        <button type="button" className="mode-tile mode-tile--accent" onClick={() => onPick('queue')}>
          <span className="mode-tile__icon"><UsersRound size={20} /></span>
          <span className="mode-tile__text"><b>Queue / Open play</b><small>Host a game players can join and rotate in.</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="mode-tile mode-tile--green" onClick={() => onPick('training')}>
          <span className="mode-tile__icon"><Dumbbell size={20} /></span>
          <span className="mode-tile__text"><b>Training</b><small>Coach a session — free or paid per player.</small></span>
          <ChevronRight size={18} />
        </button>
      </div>
    </ProfileDialog>
  )
}
