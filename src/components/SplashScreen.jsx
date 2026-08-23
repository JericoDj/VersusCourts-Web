import { useEffect, useState } from 'react'
import circularLogo from '../assets/logos/versus_courts_circular.webp'
import logoText from '../assets/logos/Logo_Text_No_Background.webp'

export default function SplashScreen({ onFinish, minDuration = 1400 }) {
  const [phase, setPhase] = useState('visible') // 'visible' | 'fading' | 'gone'

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('fading')
      const removeTimer = setTimeout(() => {
        setPhase('gone')
        onFinish?.()
      }, 500)
      return () => clearTimeout(removeTimer)
    }, minDuration)

    return () => clearTimeout(timer)
  }, [minDuration, onFinish])

  if (phase === 'gone') return null

  return (
    <div
      className={`app-splash-screen ${phase === 'fading' ? 'app-splash-screen--fading' : ''}`}
      aria-hidden="true"
    >
      <div className="app-splash-screen__content">
        <div className="app-splash-screen__circle">
          <img
            src={circularLogo}
            alt="Versus Courts"
            className="app-splash-screen__icon"
            width="86"
            height="86"
            fetchPriority="high"
          />
        </div>
        <img
          src={logoText}
          alt="Versus Courts"
          className="app-splash-screen__text"
          width="240"
          height="58"
          fetchPriority="high"
        />
        <div className="app-splash-screen__tagline">
          Play • Compete • Connect
        </div>
      </div>
    </div>
  )
}
