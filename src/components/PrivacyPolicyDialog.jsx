import { Check, Mail, ShieldCheck, X } from 'lucide-react'
import { privacyPolicy } from '../data/legalContent'
import QmDialog from './QmDialog'
import '../styles/queue-master.css'

export default function PrivacyPolicyDialog({ isOpen = true, onClose }) {
  const doc = privacyPolicy

  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="680px">
      <div className="qm-container">
        {/* Header */}
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">LEGAL & COMPLIANCE</span>
            <h1 className="qm-header-title">{doc.title}</h1>
            <p className="qm-header-subtitle">{doc.summary}</p>
          </div>
        </div>

        {/* Hero */}
        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--purple">
            <ShieldCheck size={38} />
          </div>
          <div className="qm-badge qm-badge--blue" style={{ marginBottom: 12 }}>
            Last updated: {doc.updated}
          </div>
          <h2 className="qm-hero-title">Your Privacy Matters</h2>
          <p className="qm-hero-desc">
            We are dedicated to transparent data practices and ensuring your court check-ins, profile data, and match records remain safe and secure.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {doc.sections.map((section, idx) => (
            <div key={idx} className="qm-card">
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--vc-text-primary)', margin: '0 0 10px' }}>
                {section.title}
              </h3>
              {section.paragraphs?.map((p, pIdx) => (
                <p key={pIdx} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--vc-text-secondary)', margin: '0 0 10px' }}>
                  {p}
                </p>
              ))}
              {section.bullets && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {section.bullets.map((b, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(12, 77, 209, 0.12)',
                          color: 'var(--vc-primary, #0c4dd1)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--vc-text-secondary)' }}>
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Contact Support Card */}
          <div className="qm-card" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--vc-primary, #0c4dd1)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                }}
              >
                <Mail size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Questions regarding your data?</h4>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--vc-text-secondary)' }}>
                  Contact our Data Protection team at{' '}
                  <a href="mailto:privacy@versuscourts.com" style={{ color: 'var(--vc-primary, #0c4dd1)', fontWeight: 600 }}>
                    privacy@versuscourts.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QmDialog>
  )
}
