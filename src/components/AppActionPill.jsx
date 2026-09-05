import { Bell, MessageCircle, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useNotifications } from '../context/NotificationContext'
import AppSearchOverlay from './AppSearchOverlay'
import NotificationsDropdown from './NotificationsDropdown'

/// Web port of the Player app's `AppTopNavActions` (lib/core/widgets/common.dart):
/// a 44px pill of three flush 44x44 icon buttons split by hairline dividers.
export default function AppActionPill() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const navigate = useNavigate()
  const { totalUnreadCount = 0 } = useChat()
  const { unreadCount: unreadNotifs = 0 } = useNotifications()
  const badgeText = totalUnreadCount > 99 ? '99+' : `${totalUnreadCount}`

  return (
    <>
      <div className="action-pill" style={{ position: 'relative' }}>
        <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search size={22} />
        </button>
        <span className="action-pill__divider" />
        <button type="button" aria-label="Messages" onClick={() => navigate('/app/messages')}>
          <MessageCircle size={22} />
          {totalUnreadCount > 0 && <i className="action-pill__badge">{badgeText}</i>}
        </button>
        <span className="action-pill__divider" />
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setNotifsOpen((prev) => !prev)}
        >
          <Bell size={22} />
          {unreadNotifs > 0 && <i className="action-pill__dot" />}
        </button>

        {notifsOpen && <NotificationsDropdown onClose={() => setNotifsOpen(false)} />}
      </div>
      {searchOpen && <AppSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
