import { Link } from 'react-router-dom'
import logoTextDark from '../assets/logos/Logo_Text_No_Background (3).png'
import logoTextLight from '../assets/logos/White Outline Text.png'
import circularLogo from '../assets/logos/versus_courts_circular.png'

export default function Brand({ light = false, compact = false, playerLogo = false, stacked = false, textLogo = true }) {
  const currentLogoText = light ? logoTextLight : logoTextDark

  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''} ${playerLogo ? 'brand--player-logo' : ''} ${stacked ? 'brand--player-logo-stacked' : ''}`} aria-label="Versus Courts home">
      <span className={`brand__mark ${playerLogo ? 'brand__mark--player-logo' : ''}`}>
        {playerLogo ? <img src={circularLogo} alt="Versus Courts Logo" /> : <span>V</span>}
      </span>
      {!compact && (
        textLogo ? (
          <img src={currentLogoText} alt="Versus Courts" className={`brand__text-logo ${light ? 'brand__text-logo--light' : ''}`} />
        ) : (
          <span className="brand__name">VERSUS <b>COURTS</b></span>
        )
      )}
    </Link>
  )
}
