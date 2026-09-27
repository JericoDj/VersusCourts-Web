# Trainings, Coach Mode & Training Deep Links — Web Plan

Brings the web player (`versus-web-player`) to parity with the Flutter Player
app (`VersusCourts-Player`) for **trainings**, **coach mode** and **training
share links**. The backend already supports everything below; this is a
web-only change.

## 1. Where we started (gaps)

| Area | Player app (Flutter) | Web before |
|---|---|---|
| Share link | `https://versuscourts.com/t/<id>` (`training_detail_screen.dart`) | No `/t/*` route → catch-all bounced to `/` |
| Deep link into app | `versuscourts://training/<id>` → `/training/:id` (`app_router.dart`) | Not attempted |
| iOS Universal Links | Associated domain `applinks:versuscourts.com` | AASA had no `/t/*` → iOS opened Safari, not the app |
| Browse / join trainings | `TrainingsListScreen`, `TrainingDetailScreen` | "Join a Training" tile was *Coming soon* |
| Coach mode | `/host` → `CoachModeScreen` (Sessions · Trainings · Create · Profile) | None |
| Mode switching | `ModeSwitcherBar` / `ModeSwitcherSheet` on Profile | None |

## 2. Share → open flow (the whole process)

```
Player app  ──share──▶  https://versuscourts.com/t/<id>
                                   │
      ┌────────────────────────────┼─────────────────────────────┐
  iOS, app installed        Android / iOS w/o app            Desktop
  (Universal Link via       (browser loads web /t/<id>)      (browser loads /t/<id>)
   AASA "/t/*")                    │                               │
      │                    TrainingBridgePage                TrainingBridgePage
      ▼                    auto-tries versuscourts://         signed in  → /app/trainings/<id>
  App opens                training/<id>; buttons:            signed out → public card +
  /training/<id>           Open in app · Store · Continue      "Sign in to join" (returns
                           on web                               to /app/trainings/<id>)
```

* `/t/:id`, `/training/:id`, `/trainings/:id` all render `TrainingBridgePage`.
* `/app/trainings/:id` opened signed-out is redirected to `/t/:id` (same as
  queues/clubs), so no share link ever dead-ends on the landing page.
* `LoginDialog` gained a `redirectTo` prop so sign-in returns to the training.
* AASA (`public/.well-known/…` and `public/apple-app-site-association`) now
  lists `/t/*`, `/training/*`, `/trainings/*`, `/app/trainings/*`.

## 3. Player side (web)

* **`/app/trainings`** — tabs *Upcoming · Joined · In progress · Completed ·
  Cancelled* + sport filter; `GET /trainings` and `GET /trainings/mine`
  (sessions I coach are excluded from my player lists, like the app).
* **`/app/trainings/:id`** — `TrainingDetailDialog`:
  * Free → `POST /trainings/:id/join`.
  * Paid → **Pay cash** (`paymentMethod: CASH`, lands *Requested* until the
    coach confirms) or **Pay with QR Ph in the app** (deep link — the web has
    no PayMongo checkout yet).
  * Cancel a pending request / leave (free & cash seats). Seats paid online
    need a payout account for the refund → handed off to the app.
  * Message coach (Firestore thread `coach_<coachProfileId>_<me>` with a
    `persona`, identical to `ChatProvider.startCoachThread`).
  * Rate coach after a completed session (`POST /reviews`, `targetType: COACH`).
  * Share (Web Share API → clipboard fallback) using the same `/t/<id>` URL.
* Play hub "Join a Training" tile now opens `/app/trainings`.

## 4. Coach mode (web)

* **Eligibility** (same as `_hasOtherModes`): `QUEUE_MASTER` role, or any
  `GET /coach/businesses`, or an existing coach identity.
* **Switching**: `ModeSwitcherBar` on Profile ("Playing as Player · Switch")
  opens `ModeSwitcherSheet` (Player / Coach). Inside coach mode the bar reads
  "Coaching as <identity>" in the coach orange. Business mode stays app-only
  and is shown as such.
* **`/coach`** — its own shell (`CoachShell`) with bottom nav *Sessions ·
  Trainings · (+) Create · Profile*. While mounted it sets
  `X-Acting-As: coach` on API calls (mirrors `ApiClient.actingAsCoach`).
* **Identity gate**: `GET /coach/profile` → `null` shows the setup form
  (`PATCH /coach/profile`: name, sport, experience, price, bio, photo).
* **Sessions**: overview stats (`GET /coach/overview`) + hosted queues
  (`GET /queues/mine`, filtered to ones I host).
* **Trainings**: `GET /coach/trainings`, grouped Upcoming & live / Past.
* **Create / edit**: `POST|PATCH /coach/trainings` — listed court search
  (`GET /courts?q=`, `offersCoaching` only) or custom venue, sport, skill,
  capacity, price, start, duration, cover images (`/storage/signed-url`).
* **Manage**: roster with cash *Confirm / Decline*, *Start*
  (`/start`), *Complete* with settlement preview (`/settlement-preview` →
  `/complete`), *Cancel* with optional reason, *Share*.

## 5. Files

New: `src/data/trainings.js`, `src/context/CoachContext.jsx`,
`src/pages/TrainingBridgePage.jsx`, `src/pages/TrainingsPage.jsx`,
`src/components/TrainingDetailDialog.jsx`, `src/components/ModeSwitcher.jsx`,
`src/pages/coach/*`, `src/styles/trainings.css`, `src/styles/coach.css`.

Changed: `AppRoutes.jsx`, `AppBarTitle.jsx`, `QueuesPage.jsx`,
`ProfilePage.jsx`, `LoginDialog.jsx`, `ChatContext.jsx`, `apiClient.js`,
`appLauncher.js`, both AASA files.

## 6. Follow-ups outside this repo

1. **Android App Links** — `VersusCourts-Player/android/app/src/main/AndroidManifest.xml`
   only has the `versuscourts://` scheme filter, so on Android a shared
   https link always opens the browser first (the bridge page then hands off
   to the app). To open the app directly, add an `autoVerify` https
   intent-filter for `versuscourts.com` (`/t`, `/q`, `/c`) **and** publish
   `public/.well-known/assetlinks.json` with the release keystore's SHA-256
   fingerprint (not in this repo — needs the Play Console value).
2. **Link previews** — the SPA can't server-render Open Graph tags per
   training; WhatsApp/Messenger show the generic site card. A small edge
   function for `/t/*` (and `/q/*`, `/c/*`) would fix that.
3. **QR Ph checkout on web** — needs a web PayMongo flow; until then paid
   online joins hand off to the app.
