# Versus Courts Web Player

A React/Vite web experience that combines a business landing site with a connected player application.

The UI follows the Flutter player app's shared `AppColors`, `AppSpacing`, and
`AppRadius` tokens. All site typography currently uses the locally bundled
Michroma typeface.

## Run locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`.

## Routes

- `/` — business and player landing page
- `/venues` — public venue directory
- `/for-business` — venue-owner landing page
- `/login` — player authentication experience
- `/app` — player home dashboard
- `/app/discover` — court discovery and filters
- `/app/courts/:courtId` — venue detail and booking flow
- `/app/queues` — live/open play directory
- `/app/bookings` — player schedule and booking history
- `/app/events` — tournaments and events
- `/app/profile` — player stats, sports, and settings

## Architecture

- `src/routes/AppRoutes.jsx` owns the route tree and nested player shell.
- `src/providers/AppProviders.jsx` composes application providers.
- `src/context/AuthContext.jsx` owns demo authentication and profile identity.
- `src/context/PlayerContext.jsx` owns discovery filters, saved courts, joined queues, search, and feedback.
- `src/components` contains shared brand, navigation, shell, and card components.
- `src/data/mockData.js` is the replaceable front-end data layer.

Saved courts and joined queues persist in `localStorage`. Replace `mockData.js` and the context actions with API calls when connecting the NestJS/Firebase backend.
