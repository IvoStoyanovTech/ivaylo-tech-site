# Ivaylo Tech

Frontend-only portfolio with the Strata interactive 3D sculpture, work areas, colorful technology badges, and a GitHub contribution calendar.

## Deploy on Vercel

1. Open https://vercel.com/new and import `IvoStoyanovTech/ivaylo-tech-site`.
2. If the private repository is missing, grant the Vercel GitHub integration access to it.
3. Keep the root directory at the repository root. The included `vercel.json` sets Framework Preset to **Other**, skips installation and building, and serves **public**.
4. No environment variables are required. Click **Deploy**.

Configuration reference: https://vercel.com/docs/project-configuration/vercel-json

## Files

- `public/index.html` — page structure and copy
- `public/styles.css` — layout, appearance, and motion
- `public/app.js` — work panels, contributions, and tooltips
- `public/sculpture.js` — interactive 3D artwork with a 2D fallback
- `public/contributions.json` — annual GitHub activity snapshot
- `public/badges/` — locally stored technology badges

Serve the `public` directory with any static HTTP server for local development. No dependencies or build tools are needed.

The annual calendar is a labeled snapshot of 1,511 contributions from 11 September 2025 through 10 September 2026. Update `contributions.json` to refresh that calendar. The page also includes Gaming, Sports, Chess, Anime, and Robotics interests. Do not add GitHub tokens to frontend code.

Google Fonts uses system-font fallbacks. No backend, database, or secrets are required. This repository contains the finished website, without private preview hosting configuration.

