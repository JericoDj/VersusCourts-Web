export const sports = [
  { id: 'all', label: 'All sports', icon: '✦' },
  { id: 'basketball', label: 'Basketball', icon: '●' },
  { id: 'badminton', label: 'Badminton', icon: '◒' },
  { id: 'pickleball', label: 'Pickleball', icon: '◉' },
  { id: 'tennis', label: 'Tennis', icon: '◍' },
  { id: 'padel', label: 'Padel', icon: '◇' },
]

export const venues = [
  {
    id: 'elite-sports', name: 'Elite Sports Center', area: 'Quezon City', distance: '2.1 km',
    rating: 4.8, reviews: 312, price: 250, sports: ['basketball', 'badminton'], open: true,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=85',
    description: 'Premium hardwood courts, air-conditioned halls, and complete player amenities in the heart of Quezon City.',
    amenities: ['Free parking', 'Showers', 'Lockers', 'Sports café', 'Wi-Fi', 'Air-conditioned'],
  },
  {
    id: 'smash-arena', name: 'Smash Arena', area: 'Mandaluyong', distance: '3.6 km',
    rating: 4.7, reviews: 198, price: 180, sports: ['badminton', 'pickleball'], open: true,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=85',
    description: 'Eight tournament-spec courts with cushioned mats, excellent lighting, and friendly open-play nights.',
    amenities: ['Parking', 'Lockers', 'Wi-Fi', 'Air-conditioned'],
  },
  {
    id: 'grand-slam', name: 'Grand Slam Club', area: 'Pasig', distance: '5.2 km',
    rating: 4.9, reviews: 256, price: 400, sports: ['tennis', 'padel'], open: true,
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=85',
    description: 'Clay and hard tennis courts plus two glass-walled padel courts. Pro coaching is available daily.',
    amenities: ['Parking', 'Showers', 'Pro shop', 'Sports café'],
  },
  {
    id: 'downtown-hoops', name: 'Downtown Hoops', area: 'Makati', distance: '6.8 km',
    rating: 4.6, reviews: 421, price: 300, sports: ['basketball'], open: false,
    image: 'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=85',
    description: 'A rooftop full court with city views, regular leagues, and private bookings.',
    amenities: ['Parking', 'Lockers', 'Wi-Fi'],
  },
  {
    id: 'padel-republic', name: 'Padel Republic', area: 'Taguig', distance: '8.0 km',
    rating: 4.8, reviews: 143, price: 500, sports: ['padel', 'tennis'], open: true,
    image: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=1200&q=85',
    description: 'Six panoramic courts, a coaching academy, and a vibrant post-match café.',
    amenities: ['Parking', 'Showers', 'Pro shop', 'Sports café', 'Air-conditioned'],
  },
]

export const queues = [
  { id: 'q1', title: 'Friday Night Runs', venue: 'Elite Sports Center', sport: 'basketball', level: 'Intermediate', players: 8, max: 10, time: '7:30 PM', fee: 120, host: 'Coach Paolo', featured: true },
  { id: 'q2', title: 'After-work Doubles', venue: 'Smash Arena', sport: 'badminton', level: 'All levels', players: 5, max: 8, time: '6:00 PM', fee: 80, host: 'Ria M.', featured: false },
  { id: 'q3', title: 'Padel Social Club', venue: 'Padel Republic', sport: 'padel', level: 'Beginner', players: 3, max: 4, time: '8:00 PM', fee: 250, host: 'Nico Tan', featured: true },
  { id: 'q4', title: 'Saturday Pickle Mix', venue: 'Smash Arena', sport: 'pickleball', level: 'Open', players: 6, max: 12, time: 'Sat, 9:00 AM', fee: 100, host: 'Bea Lim', featured: false },
]

export const events = [
  { id: 'e1', title: 'Summer Slam 3v3', organizer: 'Metro Ballers', venue: 'SM Megamall Court', date: 'JUL 24', sport: 'basketball', registered: 22, capacity: 32, prize: '₱25K', image: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?auto=format&fit=crop&w=1000&q=85' },
  { id: 'e2', title: 'Open Badminton Cup', organizer: 'Smash Arena', venue: 'Mandaluyong', date: 'AUG 02', sport: 'badminton', registered: 40, capacity: 64, prize: '₱15K', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85' },
  { id: 'e3', title: 'Padel Masters', organizer: 'Padel Republic', venue: 'BGC, Taguig', date: 'AUG 16', sport: 'padel', registered: 14, capacity: 24, prize: '₱30K', image: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=1000&q=85' },
]

export const clubs = [
  { id: 'c1', name: 'Metro Ballers', sport: 'basketball', area: 'Quezon City', members: 1240, rating: 4.8, image: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?auto=format&fit=crop&w=900&q=85', initials: 'MB' },
  { id: 'c2', name: 'Shuttle Smashers', sport: 'badminton', area: 'Makati', members: 860, rating: 4.7, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=85', initials: 'SS' },
  { id: 'c3', name: 'Padel Pros PH', sport: 'padel', area: 'Taguig', members: 410, rating: 4.9, image: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=900&q=85', initials: 'PP' },
]

export const activity = [
  { label: 'Friday Night Runs', meta: 'Basketball · Tonight, 7:30 PM', status: 'Joined' },
  { label: 'Elite Sports Center', meta: 'Court 2 · Jul 23, 6:00 PM', status: 'Confirmed' },
  { label: 'Summer Slam 3v3', meta: 'Tournament · Jul 24', status: 'Registered' },
]
