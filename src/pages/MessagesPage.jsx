import { MessageSquare, Search, Users, ShieldCheck, Flame } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatView from '../components/ChatView'
import { useChat } from '../context/ChatContext'
import { formatRelativeTime } from '../utils/dateUtils'
import '../styles/chat.css'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Players', icon: Users },
  { id: 'club', label: 'Clubs', icon: ShieldCheck },
  { id: 'queue', label: 'Queue', icon: Flame },
]

export default function MessagesPage() {
  const { threads, threadsOf, totalUnreadCount } = useChat()
  const { threadId } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Determine active thread
  const selectedThreadId = threadId || (threads.length > 0 && window.innerWidth > 860 ? threads[0].id : null)

  const handleSelectThread = (id) => {
    navigate(`/app/messages/${id}`)
  }

  const handleBackToList = () => {
    navigate('/app/messages')
  }

  // Filter threads by active tab & search query
  const displayedThreads = useMemo(() => {
    let list = activeTab === 'all' ? threads : threadsOf(activeTab)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((t) => {
        const titleMatch = t.title?.toLowerCase().includes(q)
        const msgMatch = t.lastMessage?.text?.toLowerCase().includes(q)
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q)
        return titleMatch || msgMatch || subtitleMatch
      })
    }

    return list
  }, [activeTab, searchQuery, threads, threadsOf])

  return (
    <div className="messages-container">
      <div className="messages-pane-card">
        {/* Left Column: Sidebar with tabs & thread list */}
        <aside className={`messages-sidebar${threadId ? ' is-hidden-mobile' : ''}`}>
          {/* Search box */}
          <div className="messages-sidebar__header">
            <div className="messages-search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search player, club, queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="messages-tabs">
            {TABS.map((tab) => {
              const count = tab.id === 'all' ? totalUnreadCount : threadsOf(tab.id).reduce((acc, t) => acc + (t.unreadCount || 0), 0)
              const isActive = activeTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`messages-tab-btn${isActive ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {Icon && <Icon size={14} />}
                  <span>{tab.label}</span>
                  {count > 0 && <span className="messages-tab-badge">{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Conversation List */}
          <div className="messages-threads-list">
            {displayedThreads.length === 0 ? (
              <div className="messages-empty-state">
                <MessageSquare size={36} />
                <p>
                  {searchQuery.trim()
                    ? `No conversations matching "${searchQuery}".`
                    : activeTab === 'direct'
                    ? 'No player messages yet.'
                    : activeTab === 'club'
                    ? 'No club chats yet. Join a club to chat!'
                    : activeTab === 'queue'
                    ? 'No queue squad messages yet.'
                    : 'No conversations found.'}
                </p>
              </div>
            ) : (
              displayedThreads.map((t) => {
                const isSelected = t.id === selectedThreadId
                const hasUnread = t.unreadCount > 0

                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`messages-thread-item${isSelected ? ' is-selected' : ''}${hasUnread ? ' has-unread' : ''}`}
                    onClick={() => handleSelectThread(t.id)}
                  >
                    <div className="messages-thread-avatar">
                      {t.avatarUrl ? (
                        <img src={t.avatarUrl} alt="" />
                      ) : t.type === 'queue' ? (
                        <span className="avatar-fallback avatar-fallback--queue">
                          <Flame size={20} />
                        </span>
                      ) : (
                        <span className="avatar-fallback">{t.title?.[0] || 'V'}</span>
                      )}
                      {t.online && <span className="messages-online-dot" />}
                    </div>

                    <div className="messages-thread-info">
                      <div className="messages-thread-top">
                        <span className="messages-thread-name">{t.title}</span>
                        <span className="messages-thread-time">
                          {formatRelativeTime(t.lastMessage?.timestamp)}
                        </span>
                      </div>

                      <div className="messages-thread-bottom">
                        <p className="messages-thread-preview">
                          {t.lastMessage?.text || 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="messages-unread-pill">{t.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Column: Chat View */}
        <section className={`chat-pane${!threadId ? ' is-hidden-mobile' : ''}`}>
          {selectedThreadId ? (
            <ChatView threadId={selectedThreadId} onBack={handleBackToList} />
          ) : (
            <div className="chat-pane-placeholder">
              <MessageSquare />
              <h3>Your Messages</h3>
              <p>Select a player, club, or queue conversation to start chatting.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
