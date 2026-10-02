import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  Gavel,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Star,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { uploadImage } from '../data/imageUploadService'
import { useAuth } from '../context/AuthContext'
import ImagePickerField from '../components/ImagePickerField'
import QmDialog from '../components/QmDialog'
import '../styles/queue-master.css'
import { feeLabel, feeRules, loadPlatformFees } from '../data/platformFees'

loadPlatformFees()

export default function QueueMasterPage({ isDialog = false, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const renderBack = (onBack) => {
    if (onBack) {
      return (
        <button type="button" className="qm-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      )
    }
    if (onClose) {
      return (
        <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      )
    }
    return (
      <Link to="/app/profile" className="qm-back-btn" aria-label="Back to Profile">
        <ArrowLeft size={18} />
      </Link>
    )
  }

  const wrap = (node) => (isDialog || onClose ? <QmDialog isOpen onClose={onClose}>{node}</QmDialog> : node)

  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState(null)
  const [fetchError, setFetchError] = useState('')

  // Form states
  const [step, setStep] = useState(0) // 0 = Intro/Requirements, 1 = Form
  const [isReapplying, setIsReapplying] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToConfirm, setAgreedToConfirm] = useState(false)

  // Field values
  const [reason, setReason] = useState('')
  const [ewalletName, setEwalletName] = useState('GCash')
  const [ewalletAccountName, setEwalletAccountName] = useState('')
  const [ewalletNumber, setEwalletNumber] = useState('')
  const [address, setAddress] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idExpiresAt, setIdExpiresAt] = useState('')

  // Uploaded documents (can be preview URL + File or existing URL string)
  const [idDocumentPreview, setIdDocumentPreview] = useState('')
  const [idDocumentFile, setIdDocumentFile] = useState(null)
  const [ewalletDocumentPreview, setEwalletDocumentPreview] = useState('')
  const [ewalletDocumentFile, setEwalletDocumentFile] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadApplication = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await apiRequest('/queue-master-applications/my-application')
      setApplication(res || null)
    } catch (err) {
      setFetchError(err.message || 'Could not load application status.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    apiRequest('/queue-master-applications/my-application')
      .then((res) => {
        if (active) {
          setApplication(res || null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setFetchError(err.message || 'Could not load application status.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const isAlreadyQueueMaster =
    Boolean(user?.roles?.includes('QUEUE_MASTER')) ||
    application?.status === 'APPROVED'

  const handleStartReapply = () => {
    setReason('')
    setEwalletName('GCash')
    setEwalletAccountName('')
    setEwalletNumber('')
    setAddress('')
    setIdNumber('')
    setIdExpiresAt('')
    setIdDocumentPreview('')
    setIdDocumentFile(null)
    setEwalletDocumentPreview('')
    setEwalletDocumentFile(null)
    setAgreedToTerms(false)
    setAgreedToConfirm(false)
    setSubmitError('')
    setStep(0)
    setIsReapplying(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!reason.trim()) {
      setSubmitError('Please provide a reason why you want to become a Queue Master.')
      return
    }
    if (!ewalletName) {
      setSubmitError('Please select an E-Wallet provider.')
      return
    }
    if (!ewalletAccountName.trim()) {
      setSubmitError('Please provide your E-Wallet account name.')
      return
    }
    const cleanDigits = ewalletNumber.replace(/\D/g, '')
    if (cleanDigits.length !== 10) {
      setSubmitError('Please enter a valid 10-digit mobile number (e.g. 9171234567).')
      return
    }
    if (!address.trim()) {
      setSubmitError('Please provide your complete address.')
      return
    }
    if (!idNumber.trim()) {
      setSubmitError('Please provide your valid government ID number.')
      return
    }
    if (!idDocumentPreview && !idDocumentFile) {
      setSubmitError('Please upload a Proof of ID document.')
      return
    }
    if (!ewalletDocumentPreview && !ewalletDocumentFile) {
      setSubmitError('Please upload a Proof of E-Wallet document.')
      return
    }
    if (!agreedToConfirm) {
      setSubmitError('You must confirm that the details are accurate and agree to the Terms of Use.')
      return
    }

    setSubmitting(true)

    try {
      let finalIdDocUrl = idDocumentPreview
      if (idDocumentFile) {
        finalIdDocUrl = await uploadImage(idDocumentFile, { folder: 'queue-master-applications' })
      }

      let finalEwalletDocUrl = ewalletDocumentPreview
      if (ewalletDocumentFile) {
        finalEwalletDocUrl = await uploadImage(ewalletDocumentFile, { folder: 'queue-master-applications' })
      }

      const payload = {
        reason: reason.trim(),
        ewalletName,
        ewalletAccountName: ewalletAccountName.trim(),
        ewalletNumber: `+63${cleanDigits}`,
        address: address.trim(),
        idNumber: idNumber.trim(),
        idDocumentUrl: finalIdDocUrl,
        ewalletDocumentUrl: finalEwalletDocUrl,
        agreedToTerms: true,
      }

      if (idExpiresAt) {
        payload.idExpiresAt = new Date(idExpiresAt).toISOString()
      }

      const created = await apiRequest('/queue-master-applications', {
        method: 'POST',
        body: payload,
      })

      setApplication(created)
      setIsReapplying(false)
      setStep(0)
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit application. Please check your inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading view
  if (loading) {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <h1 className="qm-header-title">Queue Master</h1>
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', padding: '80px 0' }}>
          <Loader2 size={36} className="animate-spin" color="var(--vc-primary, #0c4dd1)" />
          <p style={{ marginTop: 14, color: 'var(--vc-text-secondary, #64748b)', fontSize: 14 }}>
            Loading application status...
          </p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <h1 className="qm-header-title">Queue Master</h1>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--vc-danger, #dc2626)', marginBottom: 14, fontSize: 14 }}>{fetchError}</p>
          <button type="button" className="button button--outline button--sm" onClick={loadApplication}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // State A: User is already an active Queue Master
  if (isAlreadyQueueMaster) {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <h1 className="qm-header-title">Queue Master</h1>
          </div>
        </div>

        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--active">
            <div className="qm-hero-inner-circle">
              <ShieldCheck size={36} />
            </div>
          </div>

          <div className="qm-status-pill qm-status-pill--active">
            <span className="qm-status-pill__dot" />
            ACTIVE
          </div>

          <h2 className="qm-hero-title">You are a Queue Master!</h2>
          <p className="qm-hero-desc">
            Your Queue Master privileges are active. You can host paid and featured queues with custom entry fees.
          </p>
        </div>

        {/* Submitted details summary if available */}
        {application && (
          <div className="qm-card">
            <div className="qm-card-header">
              <div className="qm-card-icon qm-card-icon--green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="qm-card-title">Active Account Details</h3>
                <p className="qm-card-subtitle">Verified payout and identity information</p>
              </div>
            </div>

            <hr className="qm-card-divider" />

            <div className="qm-details-grid">
              {(application.ewalletName || application.ewalletNumber) && (
                <div className="qm-detail-row">
                  <Wallet size={16} />
                  <div>
                    <div className="qm-detail-label">Payout Account</div>
                    <div className="qm-detail-value">
                      {application.ewalletName || 'E-Wallet'}{' '}
                      {application.ewalletAccountName ? `(${application.ewalletAccountName})` : ''}
                      <br />
                      <span style={{ fontSize: 13, color: 'var(--vc-text-secondary, #64748b)' }}>
                        {application.ewalletNumber}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {application.address && (
                <div className="qm-detail-row">
                  <MapPin size={16} />
                  <div>
                    <div className="qm-detail-label">Complete Address</div>
                    <div className="qm-detail-value">{application.address}</div>
                  </div>
                </div>
              )}

              {application.idNumber && (
                <div className="qm-detail-row">
                  <ShieldCheck size={16} />
                  <div>
                    <div className="qm-detail-label">Government ID Number</div>
                    <div className="qm-detail-value">{application.idNumber}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="qm-actions-stack">
          <button
            type="button"
            className="qm-btn qm-btn--primary"
            onClick={() => navigate('/app/queues')}
          >
            Start Creating Queues
          </button>
          <Link to="/app/profile" className="qm-btn qm-btn--outline">
            Back to Profile
          </Link>
        </div>
      </div>
    )
  }

  // State B: Application is pending review
  if (application?.status === 'PENDING') {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <h1 className="qm-header-title">Queue Master</h1>
          </div>
        </div>

        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--pending">
            <div className="qm-hero-inner-circle">
              <Clock size={34} />
            </div>
          </div>

          <div className="qm-status-pill qm-status-pill--pending">
            <span className="qm-status-pill__dot" />
            UNDER REVIEW
          </div>

          <h2 className="qm-hero-title">Application Under Review</h2>
          <p className="qm-hero-desc">
            Our team is verifying your application details. You will receive a notification once your application is approved.
          </p>
        </div>

        {/* Review Progress Timeline (matches mobile _buildTimelineStep) */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--blue">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Review Progress</h3>
              <p className="qm-card-subtitle">Tracking your verification timeline</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Step 1: Application Submitted */}
            <div className="qm-timeline-item">
              <div className="qm-timeline-indicator">
                <div className="qm-timeline-circle qm-timeline-circle--done">
                  <Check size={16} />
                </div>
                <div className="qm-timeline-line qm-timeline-line--done" />
              </div>
              <div className="qm-timeline-text">
                <h4>Application Submitted</h4>
                <p>Your details and document proofs have been logged.</p>
              </div>
            </div>

            {/* Step 2: Account & Document Verification */}
            <div className="qm-timeline-item">
              <div className="qm-timeline-indicator">
                <div className="qm-timeline-circle qm-timeline-circle--active">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
                </div>
                <div className="qm-timeline-line qm-timeline-line--pending" />
              </div>
              <div className="qm-timeline-text">
                <h4 style={{ color: 'var(--vc-primary, #0c4dd1)' }}>Account & Document Verification</h4>
                <p>Queue Master application is being verified by admin.</p>
              </div>
            </div>

            {/* Step 3: Activation */}
            <div className="qm-timeline-item">
              <div className="qm-timeline-indicator">
                <div className="qm-timeline-circle qm-timeline-circle--pending">
                  3
                </div>
              </div>
              <div className="qm-timeline-text">
                <h4 style={{ color: 'var(--vc-text-tertiary, #94a3b8)' }}>Queue Master Activation</h4>
                <p>Host featured & paid queues with custom entry fees.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submitted Details Card */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--orange">
              <FileEdit size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Submitted Details</h3>
              <p className="qm-card-subtitle">Details currently in review</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div className="qm-details-grid">
            {(application.ewalletName || application.ewalletNumber) && (
              <div className="qm-detail-row">
                <Wallet size={16} />
                <div>
                  <div className="qm-detail-label">Payout Account</div>
                  <div className="qm-detail-value">
                    {application.ewalletName || 'E-Wallet'}{' '}
                    {application.ewalletAccountName ? `(${application.ewalletAccountName})` : ''}
                    <br />
                    <span style={{ fontSize: 13, color: 'var(--vc-text-secondary, #64748b)' }}>
                      {application.ewalletNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {application.address && (
              <div className="qm-detail-row">
                <MapPin size={16} />
                <div>
                  <div className="qm-detail-label">Address</div>
                  <div className="qm-detail-value">{application.address}</div>
                </div>
              </div>
            )}

            {application.idNumber && (
              <div className="qm-detail-row">
                <ShieldCheck size={16} />
                <div>
                  <div className="qm-detail-label">ID Number</div>
                  <div className="qm-detail-value">{application.idNumber}</div>
                </div>
              </div>
            )}

            {(application.idDocumentUrl || application.ewalletDocumentUrl) && (
              <div className="qm-detail-row">
                <ExternalLink size={16} />
                <div>
                  <div className="qm-detail-label">Uploaded Proof Documents</div>
                  <div className="qm-doc-links">
                    {application.idDocumentUrl && (
                      <a
                        href={application.idDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="qm-doc-link-btn"
                      >
                        <ExternalLink size={13} />
                        View Proof of ID
                      </a>
                    )}
                    {application.ewalletDocumentUrl && (
                      <a
                        href={application.ewalletDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="qm-doc-link-btn"
                      >
                        <ExternalLink size={13} />
                        View Proof of E-Wallet
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="qm-actions-stack">
          <Link to="/app/profile" className="qm-btn qm-btn--primary">
            Back to Profile
          </Link>
          <button
            type="button"
            className="qm-btn qm-btn--outline"
            onClick={loadApplication}
          >
            <RefreshCw size={15} />
            Refresh Status
          </button>
        </div>
      </div>
    )
  }

  // State C: Application Rejected
  if (application?.status === 'REJECTED' && !isReapplying) {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <h1 className="qm-header-title">Queue Master</h1>
          </div>
        </div>

        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--rejected">
            <div className="qm-hero-inner-circle">
              <XCircle size={36} />
            </div>
          </div>

          <div className="qm-status-pill qm-status-pill--rejected">
            <span className="qm-status-pill__dot" />
            REJECTED
          </div>

          <h2 className="qm-hero-title">Application Rejected</h2>
          <p className="qm-hero-desc">
            Unfortunately, your application was not approved by the admin team.
          </p>
        </div>

        {/* Rejection Reason Card */}
        <div className="qm-rejection-card">
          <div className="qm-rejection-title">
            <AlertCircle size={17} />
            Rejection Reason
          </div>
          <p className="qm-rejection-body">
            {application.rejectionReason || 'No specific reason was provided. Please ensure all ID and payout proofs are clear and valid.'}
          </p>
        </div>

        {/* Submitted Details */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--orange">
              <FileEdit size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Previously Submitted Details</h3>
              <p className="qm-card-subtitle">Review and update these details when re-applying</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div className="qm-details-grid">
            {application.ewalletName && (
              <div className="qm-detail-row">
                <Wallet size={16} />
                <div>
                  <div className="qm-detail-label">Payout Account</div>
                  <div className="qm-detail-value">
                    {application.ewalletName} ({application.ewalletAccountName || 'Account'})
                    <br />
                    <span style={{ fontSize: 13, color: 'var(--vc-text-secondary, #64748b)' }}>
                      {application.ewalletNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {application.idNumber && (
              <div className="qm-detail-row">
                <ShieldCheck size={16} />
                <div>
                  <div className="qm-detail-label">ID Number</div>
                  <div className="qm-detail-value">{application.idNumber}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="qm-actions-stack">
          <button
            type="button"
            className="qm-btn qm-btn--primary"
            onClick={handleStartReapply}
          >
            Re-Apply Now
          </button>
          <Link to="/app/profile" className="qm-btn qm-btn--outline">
            Back to Profile
          </Link>
        </div>
      </div>
    )
  }

  // State D: Step 0 — Intro & Requirements Checklist
  if (step === 0) {
    return wrap(
      <div className="qm-container">
        <div className="qm-header">
          {renderBack()}
          <div className="qm-header-titles">
            <span className="qm-header-step">Step 1 of 2</span>
            <h1 className="qm-header-title">Become a Queue Master</h1>
          </div>
        </div>

        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--star">
            <Star size={40} fill="currentColor" />
          </div>

          <h2 className="qm-hero-title">Become a Queue Master</h2>
          <p className="qm-hero-desc">
            Queue Masters can host featured queues and charge entry fees for their games. Read the requirements and terms below before applying.
          </p>
        </div>

        {/* What you'll need checklist card */}
        <div className="qm-card">
          <div className="qm-checklist-header">WHAT YOU&apos;LL NEED</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="qm-checklist-item">
              <div className="qm-checklist-icon" style={{ background: 'rgba(12, 77, 209, 0.10)', color: 'var(--vc-primary, #0c4dd1)' }}>
                <FileEdit size={20} />
              </div>
              <div className="qm-checklist-text">
                <h4>A brief reason for applying</h4>
                <p>Tell us why you want to host paid queues.</p>
              </div>
            </div>

            <hr className="qm-card-divider" style={{ margin: 0 }} />

            <div className="qm-checklist-item">
              <div className="qm-checklist-icon" style={{ background: 'rgba(249, 115, 22, 0.12)', color: 'var(--vc-accent, #f97316)' }}>
                <ShieldCheck size={20} />
              </div>
              <div className="qm-checklist-text">
                <h4>A valid government ID</h4>
                <p>ID number plus a clear photo of the document.</p>
              </div>
            </div>

            <hr className="qm-card-divider" style={{ margin: 0 }} />

            <div className="qm-checklist-item">
              <div className="qm-checklist-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--vc-brand-green, #16a34a)' }}>
                <Wallet size={20} />
              </div>
              <div className="qm-checklist-text">
                <h4>An e-wallet for payouts</h4>
                <p>GCash, Maya, GrabPay, GoTyme, or others.</p>
              </div>
            </div>

            <hr className="qm-card-divider" style={{ margin: 0 }} />

            <div className="qm-checklist-item">
              <div className="qm-checklist-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#0891b2' }}>
                <MapPin size={20} />
              </div>
              <div className="qm-checklist-text">
                <h4>Your complete address</h4>
                <p>Used for account verification only.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Fee Callout Box */}
        <div className="qm-terms-box">
          <label className="qm-terms-checkbox-label">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>I agree to the Terms and Conditions</span>
          </label>

          <div className="qm-terms-bullet">
            <Info size={16} />
            <span>
              The platform charges a {feeLabel(feeRules().queue)} fee on paid queue entry fees. Processing of payments take 2-3 days for verification of the queue.
            </span>
          </div>

          <div className="qm-terms-bullet">
            <Gavel size={16} />
            <span>
              Queue Masters operate as independent hosts, not employees or agents of Versus Courts. Approval does not create an employer-employee relationship, and no salary, benefits, or work schedule is implied — only the platform commission above.
            </span>
          </div>
        </div>

        <button
          type="button"
          className="qm-btn qm-btn--primary"
          disabled={!agreedToTerms}
          onClick={() => setStep(1)}
        >
          Continue to Application
        </button>
        <div className="qm-step-indicator">Step 1 of 2</div>
      </div>
    )
  }

  // State E: Step 1 — Application Form
  return wrap(
    <div className="qm-container">
      <div className="qm-header">
        {renderBack(() => setStep(0))}
        <div className="qm-header-titles">
          <span className="qm-header-step">Step 2 of 2</span>
          <h1 className="qm-header-title">Application Details</h1>
          <p className="qm-header-subtitle">
            Fill in the details below so we can verify your application.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Your Reason */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--blue">
              <FileEdit size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Your Reason</h3>
              <p className="qm-card-subtitle">Why should we approve you?</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-reason">
              Why do you want to be a Queue Master? *
            </label>
            <textarea
              id="qm-reason"
              className="qm-textarea"
              rows={4}
              placeholder="Tell us about your hosting experience, your community, and why you want to organize games on Versus Courts..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 2: Payout Details */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--green">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Payout Details</h3>
              <p className="qm-card-subtitle">Where we send your queue earnings</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-ewallet-provider">
              E-Wallet Provider *
            </label>
            <select
              id="qm-ewallet-provider"
              className="qm-select"
              value={ewalletName}
              onChange={(e) => setEwalletName(e.target.value)}
              required
            >
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="GrabPay">GrabPay</option>
              <option value="GoTyme">GoTyme</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-ewallet-name">
              E-Wallet Account Name *
            </label>
            <input
              id="qm-ewallet-name"
              type="text"
              className="qm-input"
              maxLength={100}
              placeholder="e.g. Juan Dela Cruz"
              value={ewalletAccountName}
              onChange={(e) => setEwalletAccountName(e.target.value)}
              required
            />
          </div>

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-ewallet-number">
              E-Wallet Number *
            </label>
            <div className="qm-phone-wrapper">
              <span className="qm-phone-prefix">+63</span>
              <input
                id="qm-ewallet-number"
                type="tel"
                className="qm-phone-input"
                maxLength={10}
                placeholder="9171234567"
                value={ewalletNumber}
                onChange={(e) => setEwalletNumber(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--vc-text-secondary, #64748b)', margin: '4px 0 0' }}>
              Enter 10-digit number without the leading zero
            </p>
          </div>
        </div>

        {/* Section 3: Identity Verification */}
        <div className="qm-card">
          <div className="qm-card-header">
            <div className="qm-card-icon qm-card-icon--orange">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="qm-card-title">Identity Verification</h3>
              <p className="qm-card-subtitle">Your address, ID, and proof documents</p>
            </div>
          </div>

          <hr className="qm-card-divider" />

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-address">
              Complete Address *
            </label>
            <textarea
              id="qm-address"
              className="qm-textarea"
              rows={2}
              maxLength={200}
              placeholder="House/Unit #, Street, Barangay, City, Province"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-id-number">
              Government ID Number *
            </label>
            <input
              id="qm-id-number"
              type="text"
              className="qm-input"
              maxLength={30}
              placeholder="e.g. UMID, Driver's License, Passport, or National ID number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </div>

          <div className="qm-field">
            <label className="qm-label" htmlFor="qm-id-expiry">
              ID Expiry Date (optional)
            </label>
            <input
              id="qm-id-expiry"
              type="date"
              className="qm-input"
              min={new Date().toISOString().slice(0, 10)}
              value={idExpiresAt}
              onChange={(e) => setIdExpiresAt(e.target.value)}
            />
            <p style={{ fontSize: 12, color: 'var(--vc-text-secondary, #64748b)', margin: '4px 0 0' }}>
              Leave blank if no expiry or not applicable (e.g. Philippine National ID)
            </p>
          </div>

          <div className="qm-uploads-row">
            <div>
              <ImagePickerField
                label="Proof of ID *"
                value={idDocumentPreview}
                folder="queue-master-applications"
                helperText="Upload a clear photo of your government ID"
                deferUpload={true}
                onChange={(previewOrUrl, file) => {
                  setIdDocumentPreview(previewOrUrl)
                  setIdDocumentFile(file)
                }}
              />
            </div>

            <div>
              <ImagePickerField
                label="Proof of E-Wallet *"
                value={ewalletDocumentPreview}
                folder="queue-master-applications"
                helperText="Screenshot showing your verified account name & number"
                deferUpload={true}
                onChange={(previewOrUrl, file) => {
                  setEwalletDocumentPreview(previewOrUrl)
                  setEwalletDocumentFile(file)
                }}
              />
            </div>
          </div>
        </div>

        {/* Confirmation Agreement */}
        <div style={{ marginBottom: 20 }}>
          <label className="qm-terms-checkbox-label" style={{ fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={agreedToConfirm}
              onChange={(e) => setAgreedToConfirm(e.target.checked)}
              required
            />
            <span>
              I agree to the <Link to="/terms" target="_blank" style={{ color: 'var(--vc-primary, #0c4dd1)' }}>Terms of Use</Link> and confirm that all details and documents provided are accurate.
            </span>
          </label>
        </div>

        {submitError && (
          <div className="qm-error-box">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{submitError}</span>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            type="submit"
            className="qm-btn qm-btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--vc-text-secondary, #64748b)', margin: '10px 0 0' }}>
            Applications are reviewed by our team within a few days.
          </p>
        </div>
      </form>
    </div>
  )
}

export function QueueMasterDialog({ isOpen = true, onClose }) {
  return <QueueMasterPage isDialog={true} onClose={onClose} />
}
