import {
  Ban,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from './PublicFooter'
import PublicHeader from './PublicHeader'

const documentIcons = {
  privacy: LockKeyhole,
  terms: FileCheck2,
  security: ShieldCheck,
}

function sectionId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function LegalDocumentPage({ document }) {
  const DocumentIcon = documentIcons[document.type] || FileCheck2

  return (
    <div className={`legal-page legal-page--${document.type}`}>
      <PublicHeader />
      <main>
        <section className="legal-hero">
          <div className="container legal-hero__inner">
            <span className="legal-hero__icon"><DocumentIcon /></span>
            <span className="eyebrow">{document.eyebrow}</span>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
            <small>Last updated: {document.updated}</small>
          </div>
        </section>

        <section className="legal-content">
          <div className="container legal-content__layout">
            <aside className="legal-nav">
              <b>ON THIS PAGE</b>
              <nav aria-label={`${document.title} sections`}>
                {document.sections.map((section, index) => (
                  <a href={`#${sectionId(section.title)}`} key={section.title}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="legal-document">
              {document.callout && (
                <article className="legal-safety-card">
                  <span><Ban /></span>
                  <div>
                    <h2>{document.callout.title}</h2>
                    <p>{document.callout.body}</p>
                  </div>
                </article>
              )}

              {document.sections.map((section, index) => (
                <article className="legal-section" id={sectionId(section.title)} key={section.title}>
                  <div className="legal-section__heading">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h2>{section.title}</h2>
                  </div>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul>
                      {section.bullets.map((item) => (
                        <li key={item}><CheckCircle2 /> <span>{item}</span></li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}

              <article className="legal-contact">
                <span><Mail /></span>
                <div>
                  <small>NEED HELP?</small>
                  <h2>Talk to our support team</h2>
                  <p>{document.closing || 'For questions about this document or your account, contact Versus Courts support.'}</p>
                </div>
                <Link className="button button--primary" to="/support">Contact support</Link>
              </article>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
