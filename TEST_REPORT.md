# Money Mate Static QA Report

Date: 2026-05-20

## Test Account

Used a separate local QA user: `qa-test`

## Phase Results

- Server smoke test: Passed
- JavaScript syntax checks: Passed
- Login/register: Passed
- Accounts: Passed
- Pay calculator: Passed after fixing number field entry
- Monthly budget: Passed
- Spending tracker: Passed
- Account balance update after spending: Passed
- Dashboard rollups: Passed
- Bills: Passed
- Debts: Passed
- Reports: Passed
- Settings page: Passed
- Help page: Passed
- Updated email signup/login flow: Passed
- Secure reset-password link flow: Passed
- Security hardening pass: Passed with remaining production notes below
- Cloud data storage wiring: Passed code checks; requires Firestore to be enabled in Firebase Console
- Penetration-style security review: Passed with launch checklist items

## Fixes Made During QA

- Saving actions now refresh the UI immediately after success.
- Dashboard now shows account totals clearly.
- Number fields now show blank instead of default `0`, making data entry easier and preventing accidental appended values.
- Create Account now opens a separate signup screen.
- Signup asks for name, email, and password.
- After signup, the user is sent back to login instead of being logged in automatically.
- Login now uses email instead of user ID.
- Forgot password opens a reset screen.
- Reset screen now asks for email only.
- Direct local password reset was removed because it does not verify email ownership.
- Firebase Authentication support was added for secure hosted login, account creation and verified email reset links.
- Login now removes old local password records when Firebase is enabled.
- Logout now also signs out from Firebase.
- Password reset avoids revealing whether an email address exists.
- User-entered and imported text is escaped before display.
- Local server and Netlify config now include basic security headers.
- Finance data now saves to Cloud Firestore when Firebase is enabled.
- Cloud data path is `users/{uid}/finance/main`.
- Firestore rules were added so users can only read and write their own `users/{uid}` data.
- Firestore writes are now limited to expected top-level fields.
- Local cached finance data is removed on logout.
- Local password fallback was removed so login fails closed if Firebase is not connected.
- Backup import file size is limited.

## Remaining Production Security Notes

- A local browser copy is still kept as a fallback cache, but Firestore is now the main cloud store when enabled.
- Firebase web config is safe to be public, but Firestore rules and authorized domains must be configured before launch.
- Use HTTPS on the hosted domain.
- Enable Firebase App Check before public launch.
- Set Firebase/Google Cloud billing budget alerts before public launch.

## Verified Scenario

1. Created QA user.
2. Added pay: hourly rate `20`, weekly hours `37.5`.
3. Added account: `QA Bank`, balance `1000`.
4. Added budget: Food, monthly limit `200`.
5. Added spending: Tesco, Food, `50`, paid from QA Bank.
6. Confirmed account balance changed to `950`.
7. Confirmed dashboard showed:
   - Pay in: about `£2,633`
   - Money out: `£87` after spending, bill, and minimum debt payment
   - In accounts: `£950`
   - Debt: `£300`
   - Budget progress: `£150 left`
