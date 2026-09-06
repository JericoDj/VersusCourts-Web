# Player profile parity

Reference: `VersusCourts-Player/lib/presentation/profile`, `wallet`, `booking`, and `legal`.

## Implementation sequence
1. Replace profile placeholders with routed web screens, shared accessible dialogs, real profile refresh, editable identity/photos/area/bio, and achievement progress/details.
2. Add a previewable stats card with download/share, Queue Master application and review/status flows using existing upload and application APIs.
3. Connect transactions, transaction detail, queue credits/settlement, booking actions, and queue history/recaps to existing server data.
4. Link canonical privacy and terms pages. Add security and immediate/scheduled deletion, fresh identity verification, pending-deletion cancellation, and logout on success.
5. Verify targeted lint, build, pure data rules, and browser layouts. Never submit a real application/payment/deletion merely to test it.

## Acceptance criteria
- Profile actions have working destinations rather than Coming Soon dialogs.
- Data loading, errors, retry, cancellation, and submission states are visible.
- Profile changes refresh the signed-in identity; stats and achievements use server data.
- Financial and deletion operations retain server authorization and mobile confirmation steps.
- Narrow layouts and dialog keyboard navigation work.

## Validation and remaining gaps
Updated as implementation and checks complete; this plan is not a claim of completed parity.
