# Money Mate Static

A clean, host-ready personal finance web app built with plain HTML, CSS and JavaScript.

## Run Locally

Open `index.html` in a browser, or run a simple local server:

```powershell
cd money-mate-static
node server.js
```

Then open `http://localhost:8080`.

## Hosting

This folder can be uploaded directly to:

- Netlify
- Vercel
- GitHub Pages
- Any static hosting provider

No build step is required.

## Notes

When Firebase is enabled, finance data is saved to Cloud Firestore under the logged-in user's private document. A local browser copy is still kept as a fallback cache.

## Enable Secure Email Login And Password Reset Links

The static demo never changes a password from the Forgot Password screen because that would be insecure without email verification.

To use secure hosted login and send real reset links:

1. Create a Firebase project.
2. Enable Authentication > Email/Password.
3. Add your Firebase web app values in `js/firebase-config.js`.
4. Set `firebaseEnabled` to `true`.

After that, login, account creation and Forgot Password will use Firebase Authentication. The app will send a verified email reset link instead of changing a password directly in the browser.

## Enable Cloud Data Saving

1. In Firebase Console, open your project.
2. Go to Build > Firestore Database.
3. Click Create database.
4. Start in production mode.
5. Choose a region close to your users.
6. Open the Rules tab.
7. Paste the rules from `firestore.rules`.
8. Publish the rules.

The app saves data at:

```text
users/{firebase-user-uid}/finance/main
```

The rule only allows a logged-in user to read and write their own `users/{uid}` records.
