import { Link } from 'react-router-dom'

export default function Brand({ light = false, compact = false, playerLogo = false, stacked = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''} ${playerLogo ? 'brand--player-logo' : ''} ${stacked ? 'brand--player-logo-stacked' : ''}`} aria-label="Versus Courts home">
      <span className={`brand__mark ${playerLogo ? 'brand__mark--player-logo' : ''}`}>
        {playerLogo ? <img src="/versus-courts-player-logo.png" alt="" /> : <span>V</span>}
      </span>
      {!compact && <span className="brand__name">VERSUS <b>COURTS</b></span>}
    </Link>
  )
}
