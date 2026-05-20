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
