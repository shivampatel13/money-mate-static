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

Data is saved in browser `localStorage` per logged-in user. For production multi-device accounts, connect a backend such as Firebase, Supabase, or a custom Node.js API.

## Enable Secure Email Login And Password Reset Links

The static demo never changes a password from the Forgot Password screen because that would be insecure without email verification.

To use secure hosted login and send real reset links:

1. Create a Firebase project.
2. Enable Authentication > Email/Password.
3. Add your Firebase web app values in `js/firebase-config.js`.
4. Set `firebaseEnabled` to `true`.

After that, login, account creation and Forgot Password will use Firebase Authentication. The app will send a verified email reset link instead of changing a password directly in the browser.
