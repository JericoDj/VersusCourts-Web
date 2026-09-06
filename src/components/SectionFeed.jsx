import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/// One titled row of the home feed. Real data means a section can legitimately
/// be loading or empty, which the fixture-backed version never had to show —
/// this keeps that handling in one place so every row behaves the same.
export default function SectionFeed({ title, to, variant, items = [], loading, empty, emptyAction, render, count = 3, className = '' }) {
  return (
    <section className={`dashboard-section ${className}`}>
      <div className="section-title">
        <div><h2>{title}</h2></div>
        {to && <Link to={to}>See all <ChevronRight size={16} /></Link>}
      </div>
      {loading ? (
        <div className={`cards-grid cards-grid--${variant}`}>
          {Array.from({ length: count }, (_, index) => <div className="card-skeleton" key={index} />)}
        </div>
      ) : items.length ? (
        <div className={`cards-grid cards-grid--${variant}`}>{items.map(render)}</div>
      ) : (
        <div className="section-empty">
          <p>{empty}</p>
          {emptyAction}
        </div>
      )}
    </section>
  )
}
