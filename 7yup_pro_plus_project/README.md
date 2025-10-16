# 7YUP PRO+ PWA

This project is a modern, responsive Progressive Web App (PWA) that displays a curated list of promotions. It is based on the vanilla HTML/CSS/JS starter and has been customised to use real promo data from an uploaded bundle.

## Structure

- `home.html` – landing page with hero section, advice panels and FAQ.
- `index.html` – list of all promotions with search and tag filters.
- `offline.html` – fallback page when offline.
- `styles.css` – global styles, components, layout and theming.
- `js/app.js` – client‑side logic for loading data, rendering the UI, filtering, modal interactions and PWA install handling.
- `sw.js` – service worker for caching core assets and providing offline support.
- `manifest.webmanifest` – metadata for installing the app on devices.
- `data/promos.json` – generated from the supplied bundle; contains 64 promotions.
- `data/reviews.json` and `data/faq.json` – sample reviews and FAQ entries.
- `assets/banners` – promo images copied from the bundle.
- `assets/icons` – generated app icons.
- `_headers` – security headers with a permissive CSP (update `img-src` if using external image domains).
- `_redirects` – Netlify redirects root (`/`) to `home.html`.

## Development

To run the project locally, serve the `7yup_pro_plus_project` folder with a static server (e.g. `npx http-server`). For production, upload the folder to Netlify or another static host. The service worker will handle caching and offline behaviour.

If you add new promo images or host them on a CDN, update the `img-src` directive in `_headers` accordingly. Likewise, update `data/promos.json` with your new data using the same schema.