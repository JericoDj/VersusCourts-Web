import LegalDocumentPage from '../components/LegalDocumentPage'
import { termsOfUse } from '../data/legalContent'

export default function TermsPage() {
  return <LegalDocumentPage document={termsOfUse} />
}
