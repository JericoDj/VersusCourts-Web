import { CalendarDays, Check, Clock3, Image as ImageIcon, MapPin, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginDialog from './LoginDialog'
import { SportPill } from './Cards'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'Date to be announced'

export default function ClubDetailDialog({ club, onClose }) {
  const { user } = useAuth()
  const [detail, setDetail] = useState(club)
  const [upcoming, setUpcoming] = useState({ queues: [], events: [] })
  const [loading, setLoading] = useState(true)
  const [joinState, setJoinState] = useState('idle')
  const [loginOpen, setLoginOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('about')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(`${apiBase}/clubs/${club.id}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch(`${apiBase}/clubs/${club.id}/upcoming`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
    ]).then(([clubDetail, clubUpcoming]) => {
      if (clubDetail) setDetail((current) => ({ ...current, ...clubDetail, image: clubDetail.bannerUrl || clubDetail.logoUrl || current.image }))
      if (clubUpcoming) setUpcoming({ queues: clubUpcoming.queues || [], events: clubUpcoming.events || [] })
    }).catch((error) => {
      if (error.name !== 'AbortError') setUpcoming({ queues: [], events: [] })
    }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [club.id])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const joinClub = async () => {
    if (!user) {
      setLoginOpen(true)
      return
    }
    setJoinState('joining')
    try {
      const response = await fetch(`${apiBase}/clubs/${club.id}${detail.visibility === 'PRIVATE' ? '/request' : '/join'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('vc-auth-token')}` },
      })
      if (!response.ok) throw new Error('Unable to join this club right now.')
      setJoinState(detail.visibility === 'PRIVATE' ? 'requested' : 'joined')
    } catch {
      setJoinState('error')
    }
  }

  const sports = (detail.sports?.length ? detail.sports : club.sports?.length ? club.sports : [detail.sport || club.sport]).map((sport) => String(sport).toLowerCase().replaceAll('_', ' '))
  const gallery = [...new Set([detail.bannerUrl, detail.logoUrl, detail.image, ...(detail.posts || []).map((post) => post.imageUrl)].filter(Boolean))].slice(0, 4)
  const totalMembers = detail._count?.members ?? detail.memberCount ?? detail.membersCount ?? (Array.isArray(detail.members) ? detail.members.length : club.members)
  const clubRating = Number(detail.rating ?? club.rating ?? 0)
  const leaders = Array.isArray(detail.members) ? detail.members.filter((member) => ['CAPTAIN', 'ADMIN'].includes(String(member.role).toUpperCase())).slice(0, 1) : []
  const upcomingItems = [
    ...upcoming.queues.map((queue) => ({ ...queue, kind: 'Queue', when: queue.startTime })),
    ...upcoming.events.map((event) => ({ ...event, kind: 'Event', when: event.date })),
  ].sort((a, b) => new Date(a.when) - new Date(b.when)).slice(0, 1)
  const joinLabel = joinState === 'joining' ? 'Joining…' : joinState === 'joined' ? 'Joined' : joinState === 'requested' ? 'Request sent' : detail.visibility === 'PRIVATE' ? 'Request to join' : 'Join club'

  return <>
    <div className="dialog-overlay club-detail-overlay" role="presentation" onClick={onClose}>
      <section className={`dialog club-detail-dialog is-tab-${activeTab}`} role="dialog" aria-modal="true" aria-label={`${club.name} details`} onClick={(event) => event.stopPropagation()}>
        <button className="dialog__close" type="button" onClick={onClose} aria-label="Close club details"><X size={21} /></button>
        <div className="club-detail-dialog__hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,.06), rgba(15,23,42,.74)), url(${detail.bannerUrl || detail.image})` }}>
          <span className="club-detail-dialog__logo">{detail.initials || club.initials}</span>
          <div><p><MapPin size={14} /> {detail.area || club.area}</p><h2>{detail.name || club.name}</h2></div>
        </div>
        <div className="club-detail-dialog__content">
          <div className="club-detail-dialog__profile-actions">
            <div className="club-detail-dialog__mobile-profile">
              <div className="club-detail-dialog__mobile-logo"><img src={detail.logoUrl || gallery[0] || detail.image} alt="" /></div>
              <div><h2><span>{detail.name || club.name}</span><small className="club-detail-dialog__title-rating"><Star size={11} fill="currentColor" /> {clubRating > 0 ? clubRating.toFixed(1) : 'New'}</small></h2><div><span>Public</span><span>{totalMembers} {totalMembers === 1 ? 'member' : 'members'}</span>{joinState === 'joined' && <span>Member</span>}</div></div>
            </div>
            <div className="club-detail-dialog__intro">
              <div className="card-pills">{sports.map((sport) => <SportPill sport={sport} key={sport} />)}</div>
              <button type="button" className="button button--primary" onClick={joinClub} disabled={joinState === 'joining' || joinState === 'joined' || joinState === 'requested'}>{joinState === 'joined' && <Check size={17} />}{joinLabel}</button>
            </div>
          </div>
          {joinState === 'error' && <p className="club-detail-dialog__error">Unable to join right now. Please try again.</p>}
          <nav className="club-detail-dialog__tabs" aria-label="Club details"><button type="button" className={activeTab === 'about' ? 'is-active' : ''} onClick={() => setActiveTab('about')}>About</button><button type="button" className={activeTab === 'members' ? 'is-active' : ''} onClick={() => setActiveTab('members')}>Members</button><button type="button" className={activeTab === 'queues' ? 'is-active' : ''} onClick={() => setActiveTab('queues')}>Queues</button><button type="button" className={activeTab === 'events' ? 'is-active' : ''} onClick={() => setActiveTab('events')}>Events</button><button type="button" className={activeTab === 'gallery' ? 'is-active' : ''} onClick={() => setActiveTab('gallery')}>Gallery</button></nav>
          <section className="club-detail-dialog__section club-detail-dialog__section--about"><h3>About</h3>{detail.about ? <p className="club-detail-dialog__about">{detail.about}</p> : <p className="club-detail-dialog__empty">This club has not added an introduction yet.</p>}<h3 className="club-detail-dialog__sports-title">Sports</h3><div className="card-pills">{sports.map((sport) => <SportPill sport={sport} key={sport} />)}</div><div className="club-detail-dialog__mobile-about-extra"><h3>Leaders</h3>{leaders.length ? <div className="club-detail-dialog__leaders">{leaders.map((member) => { const profile = member.user || member; const name = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Club leader'; return <article key={member.id || profile.id}><span>{profile.photoURL || profile.avatarUrl ? <img src={profile.photoURL || profile.avatarUrl} alt="" /> : name[0]}</span><div><b>{name}</b><small>{String(member.role).toLowerCase()}</small></div></article> })}</div> : <p className="club-detail-dialog__empty">Club leaders will appear here.</p>}<h3 className="club-detail-dialog__upcoming-title">Upcoming</h3>{upcomingItems.length ? <div className="club-detail-dialog__upcoming">{upcomingItems.map((item) => <article key={`${item.kind}-${item.id}`}><span><CalendarDays size={17} /></span><div><b>{item.title || item.name}</b><small>{item.kind} · {formatDate(item.when)}</small></div></article>)}</div> : <div className="club-detail-dialog__nothing"><CalendarDays size={22} /><b>Nothing scheduled</b><span>Games and events shared here will show up first.</span></div>}</div></section>
          <section className="club-detail-dialog__section club-detail-dialog__section--members"><h3>Members <span className="club-detail-dialog__count">{totalMembers}</span></h3><p className="club-detail-dialog__member-total">{totalMembers} {totalMembers === 1 ? 'member has' : 'members have'} joined this club.</p></section>
          <section className="club-detail-dialog__section club-detail-dialog__section--queues"><h3><Clock3 size={18} /> Open queues</h3>{upcoming.queues.length ? <div className="club-detail-dialog__list">{upcoming.queues.map((queue) => <article key={queue.id}><SportPill sport={String(queue.sport || '').toLowerCase()} /><div><b>{queue.title}</b><span>{formatDate(queue.startTime)} · {String(queue.status || 'open').toLowerCase()}</span></div></article>)}</div> : <p className="club-detail-dialog__empty">No open queues right now.</p>}</section>
          <section className="club-detail-dialog__section club-detail-dialog__section--events"><h3><CalendarDays size={18} /> Events</h3>{upcoming.events.length ? <div className="club-detail-dialog__list">{upcoming.events.map((event) => <article key={event.id}><SportPill sport={String(event.sport || '').toLowerCase()} /><div><b>{event.title || event.name}</b><span>{formatDate(event.date)}{event.venue ? ` · ${event.venue}` : ''}</span></div></article>)}</div> : <p className="club-detail-dialog__empty">No upcoming events right now.</p>}</section>
          <section className="club-detail-dialog__section club-detail-dialog__section--gallery"><h3><ImageIcon size={18} /> Gallery</h3>{gallery.length ? <div className="club-detail-dialog__gallery">{gallery.map((image) => <img src={image} alt="" key={image} />)}</div> : <p className="club-detail-dialog__empty">Photos from this club will appear here.</p>}</section>
          {loading && <p className="club-detail-dialog__loading">Loading club details…</p>}
          <button type="button" className="club-detail-dialog__close-mobile" onClick={onClose}>Close details</button>
        </div>
      </section>
    </div>
    <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
  </>
}
