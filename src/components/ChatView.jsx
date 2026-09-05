import { Check, CheckCheck, ChevronLeft, CornerUpLeft, Flame, Paperclip, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { formatDate, formatTime } from '../utils/dateUtils'
import '../styles/chat.css'

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏']

export default function ChatView({ threadId, onBack }) {
  const { getThread, getMessages, sendMessage, markAsRead, toggleReaction, currentUserId } = useChat()
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const feedEndRef = useRef(null)
  const textareaRef = useRef(null)

  const thread = getThread(threadId)
  const messages = getMessages(threadId)

  useEffect(() => {
    if (threadId) {
      markAsRead(threadId)
    }
  }, [threadId, markAsRead])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim()) return
    sendMessage(threadId, inputText, { replyTo: replyingTo })
    setInputText('')
    setReplyingTo(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e) => {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
  }

  if (!thread) {
    return (
      <div className="chat-pane-placeholder">
        <h3>Select a conversation</h3>
        <p>Choose from your players, clubs, or queue squads on the left to view messages.</p>
      </div>
    )
  }

  // Group messages by calendar day
  let lastDateStr = ''

  return (
    <div className="chat-pane">
      {/* Header */}
      <div className="chat-header">
        {onBack && (
          <button type="button" className="chat-header__back-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={24} />
          </button>
        )}

        <div className="chat-header__avatar">
          {thread.avatarUrl ? (
            <img src={thread.avatarUrl} alt="" />
          ) : thread.type === 'queue' ? (
            <span className="avatar-fallback avatar-fallback--queue">
              <Flame size={20} />
            </span>
          ) : (
            <span className="avatar-fallback">{thread.title?.[0] || 'V'}</span>
          )}
        </div>

        <div className="chat-header__info">
          <h2 className="chat-header__title">{thread.title}</h2>
          <p className={`chat-header__subtitle${thread.online ? ' is-online' : ''}`}>
            {thread.type === 'direct'
              ? thread.online
                ? 'Active now'
                : thread.lastSeen || 'Offline'
              : thread.subtitle}
          </p>
        </div>

        <div className="chat-header__actions">
          {thread.clubId && (
            <Link to="/app/clubs" className="chat-action-btn">
              View Club
            </Link>
          )}
          {thread.queueId && (
            <Link to="/app/queues" className="chat-action-btn">
              View Queue
            </Link>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="chat-feed">
        {messages.length === 0 ? (
          <div className="messages-empty-state">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId || msg.senderId === 'user_me'
            const msgDate = formatDate(msg.timestamp)
            const showDate = msgDate !== lastDateStr
            if (showDate) lastDateStr = msgDate

            if (msg.senderId === 'system') {
              return (
                <div key={msg.id} className="chat-system-msg">
                  {msg.text}
                </div>
              )
            }

            return (
              <div key={msg.id} style={{ display: 'contents' }}>
                {showDate && <div className="chat-date-separator">{msgDate}</div>}

                <div className={`chat-message-row ${isMe ? 'is-me' : 'is-other'}`}>
                  {/* Sender Name in Group/Club/Queue chats */}
                  {!isMe && thread.type !== 'direct' && (
                    <span className="chat-sender-name">{msg.senderName || 'Player'}</span>
                  )}

                  {/* Bubble Container */}
                  <div className="chat-bubble">
                    {/* Quoted reply */}
                    {msg.replyToText && (
                      <div className="chat-quote-reply">
                        <div className="chat-quote-sender">{msg.replyToSenderName || 'Reply'}</div>
                        <div className="chat-quote-text">{msg.replyToText}</div>
                      </div>
                    )}

                    {/* Text */}
                    <div>{msg.text}</div>

                    {/* Meta Time & Check */}
                    <div className="chat-bubble-meta">
                      <span>{formatTime(msg.timestamp)}</span>
                      {isMe && (
                        <span>{msg.isRead ? <CheckCheck size={13} /> : <Check size={13} />}</span>
                      )}
                    </div>
                  </div>

                  {/* Reaction chips display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="chat-reactions-row">
                      {Object.entries(msg.reactions).map(([uid, emoji]) => (
                        <span
                          key={uid}
                          className="chat-reaction-chip"
                          onClick={() => toggleReaction(threadId, msg.id, emoji)}
                          title="Toggle reaction"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Floating Action Menu on Hover */}
                  <div className="chat-bubble-actions">
                    <button
                      type="button"
                      className="chat-action-emoji-btn"
                      onClick={() => setReplyingTo(msg)}
                      title="Reply"
                    >
                      <CornerUpLeft size={13} />
                    </button>
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="chat-action-emoji-btn"
                        onClick={() => toggleReaction(threadId, msg.id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="chat-replying-banner">
          <div className="chat-replying-left">
            <div>
              <div className="chat-replying-title">
                Replying to {replyingTo.senderId === currentUserId ? 'yourself' : replyingTo.senderName || 'message'}
              </div>
              <div className="chat-replying-snippet">{replyingTo.text}</div>
            </div>
          </div>
          <button
            type="button"
            className="chat-replying-close"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Composer Bar */}
      <div className="chat-composer-bar">
        <div className="chat-composer-container">
          <button type="button" className="chat-composer-attach-btn" aria-label="Add attachment">
            <Paperclip size={19} />
          </button>

          <textarea
            ref={textareaRef}
            className="chat-composer-textarea"
            placeholder={replyingTo ? 'Type a reply...' : 'Type a message...'}
            rows={1}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            className="chat-composer-send-btn"
            disabled={!inputText.trim()}
            onClick={handleSend}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
