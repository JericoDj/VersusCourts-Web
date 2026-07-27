import { ArrowLeft, ArrowRight, CheckCircle2, Eye, LockKeyhole, Mail, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

/// Sign-in / sign-up as a modal instead of a standalone route, so visitors
/// never lose the page they were browsing to authenticate.
export default function LoginDialog({ open, onClose }) {
  const [mode, setMode] = useState('login')
  const [flow, setFlow] = useState('auth')
  const [resetEmail, setResetEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, signUp, forgotPassword } = useAuth()
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

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      if (mode === 'login') await signIn({ email, password })
      else await signUp({ name: fullName, email, password })
      onClose()
      navigate('/app')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const continueWithGoogle = () => {
    setError('Google sign-in needs the Firebase web configuration before it can be enabled.')
  }

  const submitReset = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await forgotPassword(resetEmail)
      setFlow('reset-sent')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const returnToLogin = () => {
    setFlow('auth')
    setMode('login')
  }

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="dialog auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={flow === 'auth' ? (mode === 'login' ? 'Log in' : 'Create your account') : 'Reset password'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-dialog__brand"><Brand compact playerLogo /></div>
        {flow === 'auth' ? <>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Sign in to discover courts, join queues and book games.' : 'Join the community and find your next game.'}</p>
          <div className="auth-switch" aria-label="Authentication mode">
            <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError('') }}>Log in</button>
            <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => { setMode('signup'); setError('') }}>Sign up</button>
          </div>
          <form onSubmit={submit}>
            {mode === 'signup' && <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Your name" autoComplete="name" /></label>}
            <label>Email<span className="auth-input"><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@example.com" autoComplete="email" /></span></label>
            <label>Password<span className="auth-input"><LockKeyhole size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} required minLength="6" placeholder="Enter your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Eye size={18} /></button></span></label>
            {mode === 'login' && <div className="form-row"><label><input type="checkbox" defaultChecked /> Remember me</label><button type="button" className="text-button" onClick={() => setFlow('reset')}>Forgot password?</button></div>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} {!isSubmitting && <ArrowRight size={17} />}</button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <div className="social-buttons"><button type="button" onClick={continueWithGoogle}><img src="/google-g.svg" alt="" /> Continue with Google</button></div>
          <small>By continuing you agree to our Terms &amp; Privacy Policy.</small>
        </> : flow === 'reset' ? <>
          <h2>Reset your password</h2>
          <p>Enter your email and we’ll send a link to reset your password.</p>
          <form onSubmit={submitReset}><label>Email<span className="auth-input"><Mail size={18} /><input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} type="email" required placeholder="you@example.com" autoComplete="email" /></span></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button--primary button--full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : <>Send reset link <ArrowRight size={17} /></>}</button></form>
          <button type="button" className="auth-back" onClick={returnToLogin}><ArrowLeft size={16} /> Back to Log in</button>
        </> : <>
          <div className="auth-reset-success"><CheckCircle2 size={44} /></div>
          <h2>Check your email</h2>
          <p>We sent a password reset link to <b>{resetEmail}</b>. Follow the link to choose a new password.</p>
          <button type="button" className="button button--primary button--full" onClick={returnToLogin}>Back to Log in</button>
        </>}
      </div>
    </div>
  )
}
