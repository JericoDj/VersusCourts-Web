import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import { useAuth } from '../context/AuthContext'
import { verifyAccountIdentity } from '../lib/firebase'
import { useAccountData } from '../pages/ProfileAccountPage'
import QmDialog from './QmDialog'
import ProfileDialog from './ProfileDialog'
import '../styles/queue-master.css'

const loadDeletion = () => apiRequest('/auth/account/deletion-request')

export default function AccountSecurityDialog({ isOpen = true, onClose }) {
  const { user, signOut, forgotPassword } = useAuth()
  const navigate = useNavigate()
  const state = useAccountData(loadDeletion)

  const [blockedOpen, setBlockedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mode, setMode] = useState('scheduled') // 'scheduled' | 'now'
  const [step, setStep] = useState(1) // 1: overview/options, 2: verify identity
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const pending = state.data?.request || state.data?.pendingDeletion

  const handleKeepAccount = async () => {
    setBusy(true)
    setError('')
    try {
      await apiRequest('/auth/account/deletion-request', { method: 'DELETE' })
      state.reload()
      setNotice('Scheduled deletion cancelled. Your account remains active.')
    } catch (err) {
      setError(err.message || 'Could not cancel deletion.')
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setBusy(true)
    setError('')
    try {
      await forgotPassword(user.email)
      setNotice('Password reset instructions have been requested. Check your email.')
    } catch (err) {
      setError(err.message || 'Failed to request password reset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="680px">
      <div className="qm-container">
        {/* Header */}
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">ACCOUNT PROTECTION</span>
            <h1 className="qm-header-title">Security & Account Deletion</h1>
            <p className="qm-header-subtitle">Manage login security, blocked players, and account data</p>
          </div>
        </div>

        {/* Hero */}
        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--emerald">
            <ShieldCheck size={38} />
          </div>
          <h2 className="qm-hero-title">Account Security Center</h2>
          <p className="qm-hero-desc">
            Protect your credentials, manage messaging boundaries, and oversee your privacy preferences.
          </p>
        </div>

        {notice && (
          <div className="qm-card" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: '#16a34a', fontWeight: 600 }}>{notice}</p>
          </div>
        )}

        {error && (
          <div className="qm-error-box" style={{ marginBottom: 16 }}>
            <span>{error}</span>
          </div>
        )}

        {/* Pending Deletion Warning Card */}
        {pending && (
          <div
            className="qm-card"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={20} color="var(--vc-danger, #dc2626)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--vc-danger, #dc2626)' }}>
                Account Scheduled for Deletion
              </h3>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--vc-text-secondary, #64748b)' }}>
              Your account is scheduled for permanent deletion on{' '}
              <strong>
                {pending.scheduledFor ? new Date(pending.scheduledFor).toLocaleDateString() : '30 days'}
              </strong>
              . Signing in does not cancel deletion.
            </p>
            <button
              type="button"
              className="qm-btn qm-btn--sm qm-btn--primary"
              disabled={busy}
              onClick={handleKeepAccount}
            >
              Keep My Account
            </button>
          </div>
        )}

        {/* Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Password & Authentication Card */}
          <div className="qm-card">
            <div className="qm-card-header">
              <div className="qm-card-icon qm-card-icon--blue">
                <KeyRound size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="qm-card-title">Password & Credentials</h3>
                <p className="qm-card-subtitle">
                  Reset instructions will be sent to {user?.email || 'your registered email'}
                </p>
              </div>
              <button
                type="button"
                className="button button--outline button--sm"
                disabled={busy}
                onClick={handleResetPassword}
              >
                Reset Password
              </button>
            </div>
          </div>

          {/* Blocked Users Card */}
          <div
            className="qm-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setBlockedOpen(true)}
          >
            <div className="qm-card-header">
              <div className="qm-card-icon qm-card-icon--blue">
                <UserX size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="qm-card-title">Blocked Users</h3>
                <p className="qm-card-subtitle">Review who you’ve blocked from messaging and inviting you</p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--vc-text-secondary)' }} />
            </div>
          </div>

          {/* Delete Account Card */}
          <div
            className="qm-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setMode('scheduled')
              setStep(1)
              setError('')
              setDeleteOpen(true)
            }}
          >
            <div className="qm-card-header">
              <div className="qm-card-icon qm-card-icon--orange">
                <Trash2 size={20} color="var(--vc-danger, #dc2626)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="qm-card-title" style={{ color: 'var(--vc-danger, #dc2626)' }}>
                  Delete Account
                </h3>
                <p className="qm-card-subtitle">Permanently delete your account, stats, and profile data</p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--vc-text-secondary)' }} />
            </div>
          </div>

          {/* Structured Security Guidelines */}
          <div className="qm-card" style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--vc-text-primary)', marginBottom: 14 }}>
              Account Security Best Practices
            </h3>

            <div className="qm-legal-section">
              <h3>1. Account Security</h3>
              <p>
                Maintain the confidentiality of your account credentials. Versus Courts will never ask for your password via email or phone.
              </p>
            </div>

            <div className="qm-legal-section">
              <h3>2. Two-Factor Authentication</h3>
              <p>
                We strongly recommend keeping your Google or Firebase authentication secured with multi-factor authentication.
              </p>
            </div>

            <div className="qm-legal-section">
              <h3>3. Data Encryption</h3>
              <p>
                All sensitive data, payments, and check-in records are protected in transit and at rest using industry standard encryption protocols.
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Users Dialog */}
        {blockedOpen && (
          <BlockedUsersDialog onClose={() => setBlockedOpen(false)} />
        )}

        {/* Delete Account Dialog */}
        {deleteOpen && (
          <DeleteAccountDialog
            mode={mode}
            setMode={setMode}
            step={step}
            setStep={setStep}
            user={user}
            onClose={() => setDeleteOpen(false)}
            onSuccess={async () => {
              setDeleteOpen(false)
              await signOut()
              navigate('/', { replace: true })
            }}
          />
        )}
      </div>
    </QmDialog>
  )
}

function BlockedUsersDialog({ onClose }) {
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unblockingId, setUnblockingId] = useState(null)

  useEffect(() => {
    let active = true
    apiList('/blocks/mine')
      .then((data) => {
        if (active) {
          setBlocked(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load blocked users. Please try again.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const handleUnblock = async (entry) => {
    const userObj = entry.blocked || {}
    const userId = userObj.id || entry.blockedId
    if (!userId) return
    setUnblockingId(userId)
    try {
      await apiRequest(`/blocks/${userId}`, { method: 'DELETE' })
      setBlocked((prev) => prev.filter((b) => (b.blocked?.id || b.blockedId) !== userId))
    } catch {
      setError('Could not unblock. Try again.')
    } finally {
      setUnblockingId(null)
    }
  }

  return (
    <ProfileDialog title="Blocked Users" onClose={onClose} busy={loading || !!unblockingId}>
      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <Loader2 size={24} className="pf-spin" style={{ margin: '0 auto', color: 'var(--vc-primary)' }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p className="pf-error">{error}</p>
        </div>
      ) : !blocked.length ? (
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <UserX size={44} style={{ color: 'var(--vc-text-tertiary)', opacity: 0.5, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--vc-text-secondary)' }}>
            You haven’t blocked anyone.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blocked.map((entry) => {
            const bUser = entry.blocked || {}
            const name = bUser.username || [bUser.firstName, bUser.lastName].filter(Boolean).join(' ') || 'Player'
            const avatar = bUser.avatarUrl || bUser.photoURL
            const userId = bUser.id || entry.blockedId

            return (
              <div
                key={entry.id || userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--vc-primary)',
                    }}
                  >
                    {avatar ? (
                      <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      name[0]?.toUpperCase() || 'P'
                    )}
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>{name}</strong>
                    {bUser.username && (
                      <small style={{ display: 'block', color: 'var(--vc-text-secondary)', fontSize: 12 }}>
                        @{bUser.username}
                      </small>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="button button--outline button--sm"
                  disabled={unblockingId === userId}
                  onClick={() => handleUnblock(entry)}
                >
                  {unblockingId === userId ? <Loader2 size={14} className="pf-spin" /> : 'Unblock'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ProfileDialog>
  )
}

function DeleteAccountDialog({ mode, setMode, step, setStep, user, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState('password')
  const [confirmedCheck, setConfirmedCheck] = useState(false)

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'now') {
        const form = new FormData(e.currentTarget)
        const password = form.get('password') || ''
        const code = form.get('code') || ''

        const token = await verifyAccountIdentity({
          provider,
          email: user?.email,
          phone: user?.phoneNumber,
          password,
          smsCode: code,
        })
        await apiRequest('/auth/account', {
          method: 'DELETE',
          body: { idToken: token, immediate: true },
        })
      } else {
        await apiRequest('/auth/account/deletion-request', {
          method: 'POST',
        })
      }
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Deletion failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProfileDialog title="Delete Account" onClose={onClose} busy={busy}>
      <form onSubmit={handleFinalSubmit}>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--vc-text-secondary)' }}>
              Choose whether to schedule account deletion with a 30-day grace period, or proceed with immediate removal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: `1.5px solid ${mode === 'scheduled' ? 'var(--vc-primary, #0c4dd1)' : '#e2e8f0'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deletion_mode"
                  checked={mode === 'scheduled'}
                  onChange={() => setMode('scheduled')}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Schedule in 30 Days (Recommended)</div>
                  <div style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>You can cancel anytime within 30 days</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: `1.5px solid ${mode === 'now' ? 'var(--vc-danger, #dc2626)' : '#e2e8f0'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deletion_mode"
                  checked={mode === 'now'}
                  onChange={() => setMode('now')}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--vc-danger, #dc2626)' }}>Delete Immediately</div>
                  <div style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>Requires re-verifying your identity</div>
                </div>
              </label>
            </div>

            <button
              type="button"
              className="button button--primary button--full"
              style={{ marginTop: 8 }}
              onClick={() => {
                if (mode === 'now') setStep(2)
                else {
                  handleFinalSubmit({ preventDefault: () => {} })
                }
              }}
              disabled={busy}
            >
              {busy ? 'Processing…' : mode === 'now' ? 'Continue to Verification' : 'Confirm 30-Day Scheduled Deletion'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--vc-text-secondary)' }}>
              Enter your account password to confirm immediate deletion.
            </p>

            {error && <p className="pf-error" style={{ margin: 0 }}>{error}</p>}

            <input
              type="password"
              name="password"
              placeholder="Account Password"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
              }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
              />
              <span>I understand this action cannot be undone.</span>
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                className="button button--outline button--full"
                onClick={() => setStep(1)}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="submit"
                className="button button--danger button--full"
                disabled={busy || !confirmedCheck}
              >
                {busy ? 'Deleting…' : 'Delete Account Now'}
              </button>
            </div>
          </div>
        )}
      </form>
    </ProfileDialog>
  )
}
