import { FileCheck2, Handshake, Lightbulb } from 'lucide-react'
import PublicFooter from '../components/PublicFooter'
import PublicHeader from '../components/PublicHeader'
import SupportRequestForm from '../components/SupportRequestForm'

export default function ProposalPage() {
  return (
    <div className="proposal-page">
      <PublicHeader />
      <main>
        <section className="proposal-hero">
          <div className="container">
            <span className="eyebrow">WORK WITH VERSUS COURTS</span>
            <h1>BRING A GOOD IDEA<br /><em>INTO PLAY.</em></h1>
            <p>Propose a partnership, community program, venue collaboration, sponsorship, or product idea.</p>
          </div>
        </section>
        <section className="proposal-content">
          <div className="container">
            <aside>
              <span className="eyebrow">WHAT HAPPENS NEXT</span>
              {[[Lightbulb, 'You share the idea', 'Give us enough context to understand the opportunity.'], [FileCheck2, 'We review the fit', 'Our team checks impact, feasibility, and the right internal owner.'], [Handshake, 'We follow up', 'If there is a fit, we contact you using the email provided.']].map(([Icon, title, text]) => <article key={title}><span><Icon size={20} /></span><div><b>{title}</b><p>{text}</p></div></article>)}
            </aside>
            <section className="proposal-form-card">
              <span className="eyebrow">SUBMIT A PROPOSAL</span>
              <h2>Tell us what you have in mind</h2>
              <p>Clear proposals help us respond faster. Include the audience, expected outcome, and suggested timeline.</p>
              <SupportRequestForm type="PROPOSAL" />
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
