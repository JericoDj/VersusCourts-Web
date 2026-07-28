import LegalDocumentPage from '../components/LegalDocumentPage'
import { privacyPolicy } from '../data/legalContent'

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />
}
