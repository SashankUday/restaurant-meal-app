# Plate

Plate is a responsive React prototype for discovering and rating individual restaurant dishes in Oxford. It supports text search, sorting, dietary filters, allergen exclusions, dish details, and in-session ratings.

## Run locally

Requirements:

- Node.js 20.19+ on the Node 20 line, or Node.js 22.12+ (use an LTS release)
- npm 9 or newer

Install and start the development server:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Production build

```sh
npm run build
npm run preview
```

`npm run build` creates the deployable static site in `dist/`. `npm run preview` serves that build locally for a final smoke test. Do not deploy the development server.

For provider-specific steps, rollback guidance, and a release checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Project layout

```text
.
├── Plate.jsx       # Application, seed data, and component styles
├── main.jsx        # React browser entrypoint
├── index.html      # HTML shell and page metadata
├── netlify.toml    # Netlify build and response-header settings
├── vercel.json     # Vercel build and response-header settings
└── DEPLOYMENT.md   # Deployment and operations runbook
```

## Runtime behaviour and limitations

- The app is currently a frontend-only prototype. Dish data is bundled into `Plate.jsx`.
- New ratings exist only in React memory. They disappear when the page is refreshed and are not shared between visitors.
- No environment variables, API keys, database, authentication, or server functions are currently required.
- Fonts are loaded at runtime from Google Fonts. If they are blocked, browser fallback fonts are used.
- Allergen data is demonstrative and restaurant-provided in the interface. It must not be treated as a safety guarantee.

Before treating this as a production service, add persistent storage and a server-side rating API, abuse controls, authentication or another verification mechanism, observability, and a process for maintaining restaurant and allergen data.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create an optimized static build in `dist/` |
| `npm run preview` | Serve the production build locally |

## Configuration

There is no runtime configuration today. If public browser configuration is added through Vite, use names beginning with `VITE_` and document them in a committed `.env.example`. Never place secrets in a `VITE_` variable: Vite embeds those values in browser assets.
