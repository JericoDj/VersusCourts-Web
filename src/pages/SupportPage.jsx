import {
  ArrowRight,
  FileText,
  Mail,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicHeader from '../components/PublicHeader'
import SupportRequestForm from '../components/SupportRequestForm'

const frequentlyAsked = [
  ['How quickly will I receive a response?', 'Our team reviews every request and will reply using the email address you provide.'],
  ['Can I request account deletion here?', 'Yes. Choose Account deletion and provide the email address or username connected to your account so we can verify ownership.'],
  ['Where can I submit a partnership idea?', 'Use the proposal page for partnerships, sponsorships, venue collaborations, and community programs.'],
]

export default function SupportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = searchParams.get('type') === 'account-deletion' ? 'ACCOUNT_DELETION' : 'INQUIRY'

  const chooseType = (nextType) => {
    setSearchParams(nextType === 'ACCOUNT_DELETION' ? { type: 'account-deletion' } : {})
  }

  return (
    <div className="support-page">
      <PublicHeader />
      <main>
        <section className="support-hero">
          <div className="container support-hero__inner">
            <span className="eyebrow">VERSUS SUPPORT</span>
            <h1>HOW CAN WE<br /><em>HELP YOU PLAY?</em></h1>
            <p>Send a question, request help with your account, or reach the right Versus Courts team.</p>
          </div>
        </section>

        <section className="support-content">
          <div className="container">
            <aside className="support-options">
              <span className="eyebrow">CHOOSE A TOPIC</span>
              <button type="button" className={type === 'INQUIRY' ? 'is-active' : ''} onClick={() => chooseType('INQUIRY')}>
                <span><MessageCircle /></span>
                <div><b>General inquiry</b><small>Questions about courts, queues, clubs, events, or your account.</small></div>
                <ArrowRight />
              </button>
              <button type="button" className={type === 'ACCOUNT_DELETION' ? 'is-active' : ''} onClick={() => chooseType('ACCOUNT_DELETION')}>
                <span><Trash2 /></span>
                <div><b>Account deletion</b><small>Ask our team to verify and process an account deletion request.</small></div>
                <ArrowRight />
              </button>
              <Link to="/proposal">
                <span><FileText /></span>
                <div><b>Submit a proposal</b><small>Share a partnership, program, sponsorship, or product idea.</small></div>
                <ArrowRight />
              </Link>
              <a className="support-options__email" href="mailto:hello@versuscourts.com">
                <Mail /><span><small>DIRECT EMAIL</small><b>hello@versuscourts.com</b></span>
              </a>
            </aside>

            <section className="support-form-card">
              <span className="support-form-card__icon">{type === 'ACCOUNT_DELETION' ? <ShieldCheck /> : <MessageCircle />}</span>
              <span className="eyebrow">{type === 'ACCOUNT_DELETION' ? 'ACCOUNT SUPPORT' : 'CONTACT OUR TEAM'}</span>
              <h2>{type === 'ACCOUNT_DELETION' ? 'Request account deletion' : 'Send us an inquiry'}</h2>
              <p>{type === 'ACCOUNT_DELETION'
                ? 'We will verify account ownership before processing your request.'
                : 'Provide a few details and our support team will follow up by email.'}</p>
              <SupportRequestForm type={type} key={type} />
            </section>
          </div>
        </section>

        <section className="support-faq">
          <div className="container">
            <div>
              <span className="eyebrow">QUICK ANSWERS</span>
              <h2>Before you send<br />your request.</h2>
            </div>
            <div>
              {frequentlyAsked.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
