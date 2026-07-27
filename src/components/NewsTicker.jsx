const items = [
  { icon: 'location_on', text: '24 courts open near Quezon City' },
  { icon: 'groups', text: '11 open games looking for players tonight' },
  { icon: 'local_activity', text: 'Free to join — no booking fees, ever' },
  { icon: 'verified_user', text: 'Trusted by 2,000+ players across Metro Manila' },
  { icon: 'auto_awesome', text: 'New: padel courts now live in BGC' },
]

/// Scrolling announcement bar tucked under the floating app bar. The item
/// list is rendered twice so the -50% translation loops seamlessly.
export default function NewsTicker() {
  return (
    <div className="news-ticker">
      <div className="news-ticker__viewport">
        <div className="news-ticker__track">
          {[0, 1].map((pass) => (
            <div className="news-ticker__group" key={pass} aria-hidden={pass === 1}>
              {items.map(({ icon, text }) => (
                <span className="news-ticker__item" key={text}>
                  <span className="news-ticker__icon material-symbols-rounded" aria-hidden="true">{icon}</span>{text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
