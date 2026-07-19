import { Link } from 'react-router-dom'

export default function Brand({ light = false, compact = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`} aria-label="Versus Courts home">
      <span className="brand__mark"><span>V</span></span>
      {!compact && <span className="brand__name">VERSUS <b>COURTS</b></span>}
    </Link>
  )
}
