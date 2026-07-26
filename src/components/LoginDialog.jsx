import { ArrowRight, Eye, LockKeyhole, Mail, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

/// Sign-in / sign-up as a modal instead of a standalone route, so visitors
/// never lose the page they were browsing to authenticate.
export default function LoginDialog({ open, onClose }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Esc to dismiss, and lock background scroll while the dialog is up.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const submit = (event) => {
    event.preventDefault()
    signIn()
    onClose()
    navigate('/app')
  }

  const continueWithGoogle = () => {
    signIn()
    onClose()
    navigate('/app')
  }

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="dialog auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Log in' : 'Create your account'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-dialog__brand"><Brand compact /></div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p>{mode === 'login'
          ? 'Sign in to discover courts, join queues and book games.'
          : 'Join the community and find your next game.'}</p>

        <div className="auth-switch" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input required placeholder="Your name" /></label>}
          <label>Email
            <span className="auth-input"><Mail size={18} /><input type="email" required placeholder="you@example.com" autoComplete="email" /></span>
          </label>
          <label>Password
            <span className="auth-input">
              <LockKeyhole size={18} />
              <input type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Eye size={18} /></button>
            </span>
          </label>
          {mode === 'login' && (
            <div className="form-row">
              <label><input type="checkbox" defaultChecked /> Remember me</label>
              <a href="#forgot">Forgot password?</a>
            </div>
          )}
          <button className="button button--primary button--full" type="submit">
            {mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <div className="social-buttons">
          <button type="button" onClick={continueWithGoogle}>
            <img src="/google-g.svg" alt="" /> Continue with Google
          </button>
        </div>
        <small>By continuing you agree to our Terms &amp; Privacy Policy.</small>
      </div>
    </div>
  )
}
