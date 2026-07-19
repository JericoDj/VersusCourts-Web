import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const submit = (event) => { event.preventDefault(); signIn(); navigate('/app') }
  return <div className="auth-page"><aside><Brand light /><div><span className="eyebrow eyebrow--lime">WELCOME TO VERSUS</span><h1>YOUR NEXT GAME<br />STARTS <em>HERE.</em></h1><p>One account for every court, queue, club, and tournament.</p><div className="auth-benefits"><span><Check /> Book verified venues instantly</span><span><Check /> Join open games near you</span><span><Check /> Track your player journey</span></div></div><small>© 2026 Versus Courts</small></aside><main><Link to="/" className="back-link"><ArrowLeft size={16} /> Back home</Link><div className="auth-form"><span className="brand-mobile"><Brand /></span><span className="eyebrow">PLAYER ACCOUNT</span><h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2><p>{mode === 'login' ? 'Pick up right where you left off.' : 'Your sports community is waiting.'}</p><div className="auth-switch"><button className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>Log in</button><button className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>Sign up</button></div><form onSubmit={submit}>{mode === 'signup' && <label>Full name<input required placeholder="Your name" /></label>}<label>Email address<input type="email" required placeholder="you@example.com" defaultValue="mika@versuscourts.com" /></label><label>Password<input type="password" required defaultValue="versuscourts" /></label><div className="form-row"><label><input type="checkbox" defaultChecked /> Remember me</label><a href="#forgot">Forgot password?</a></div><button className="button button--dark button--full" type="submit">{mode === 'login' ? 'Enter player space' : 'Create account'} <ArrowRight size={17} /></button></form><div className="auth-divider"><span>or continue with</span></div><div className="social-buttons"><button>G&nbsp; Google</button><button>●&nbsp; Apple</button></div><small>By continuing, you agree to our Terms and Privacy Policy.</small></div></main></div>
}
