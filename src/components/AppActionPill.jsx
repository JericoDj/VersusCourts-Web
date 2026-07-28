import { Bell, MessageCircle, Search } from 'lucide-react'
import { useState } from 'react'
import AppSearchOverlay from './AppSearchOverlay'

/// Web port of the Player app's `AppTopNavActions` (lib/core/widgets/common.dart):
/// a 44px pill of three flush 44x44 icon buttons split by hairline dividers.
export default function AppActionPill({ messageCount = 3, hasNotifications = true }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const badgeText = messageCount > 99 ? '99+' : `${messageCount}`

  return (
    <>
      <div className="action-pill">
        <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search size={22} />
        </button>
        <span className="action-pill__divider" />
        <button type="button" aria-label="Messages">
          <MessageCircle size={22} />
          {messageCount > 0 && <i className="action-pill__badge">{badgeText}</i>}
        </button>
        <span className="action-pill__divider" />
        <button type="button" aria-label="Notifications">
          <Bell size={22} />
          {hasNotifications && <i className="action-pill__dot" />}
        </button>
      </div>
      {searchOpen && <AppSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
