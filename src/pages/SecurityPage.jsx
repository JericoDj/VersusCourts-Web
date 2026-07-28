import LegalDocumentPage from '../components/LegalDocumentPage'
import { securityPolicy } from '../data/legalContent'

export default function SecurityPage() {
  return <LegalDocumentPage document={securityPolicy} />
}
