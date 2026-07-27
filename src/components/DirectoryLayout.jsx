import { ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from './PublicFooter'
import PublicHeader from './PublicHeader'

export default function DirectoryLayout({
  accent,
  eyebrow,
  title,
  lede,
  stats,
  search,
  onSearch,
  searchLabel,
  filters,
  resultLabel,
  cta,
  extra,
  children,
}) {
  return (
    <div className="public-directory" style={{ '--directory-accent': accent, '--em-color': accent }}>
      <PublicHeader />
      <section className="directory-hero">
        <div className="container directory-hero__grid">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{lede}</p>
            <label className="directory-search">
              <Search size={18} />
              <span className="sr-only">{searchLabel}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchLabel}
              />
            </label>
          </div>
          <div className="directory-stats" aria-label="Directory summary">
            {stats.map(({ value, label, icon: Icon, color }, index) => (
              <article key={label}>
                <span className="icon-chip" style={{ '--chip-color': color ?? [accent, 'var(--vc-success)', 'var(--vc-warning)'][index % 3] }}><Icon size={19} /></span>
                <div><b>{value}</b><small>{label}</small></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <div className="directory-filter-bar">
        <div className="container">{filters}</div>
      </div>
      <main className="container directory-body">
        <div className="directory-result-count">{resultLabel}</div>
        {children}
        {extra}
      </main>
      <section className="directory-conversion">
        <div className="container">
          <div><h2>Want the full experience?</h2><p>Save favorites, join games, and manage your bookings in one place.</p></div>
          <Link className="button button--primary" to={cta.to}>{cta.label} <ArrowRight size={17} /></Link>
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
