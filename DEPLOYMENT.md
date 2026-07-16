# Deployment runbook

Plate builds to a static `dist/` directory and can be hosted by any static-site provider. Vercel and Netlify are preconfigured in this repository.

## Pre-deployment checks

From a clean checkout, run:

```sh
npm ci
npm run build
npm run preview
```

Check the preview at the URL Vite prints. Confirm that:

- the page loads without console errors;
- search, sorting, dietary filters, and allergen filters work;
- a dish modal opens, accepts a rating, and closes;
- the layout works at both narrow mobile and desktop widths;
- the disclaimer and sponsored placement label are visible.

The lockfile produced by `npm install` is committed so deployment systems can use the reproducible `npm ci` install.

## Deploy with Vercel

1. Push the repository to a Git provider supported by Vercel.
2. In Vercel, create a project and import the repository.
3. Keep the detected framework as **Vite**. The committed `vercel.json` sets the build command to `npm run build` and output directory to `dist`.
4. Use Vercel's default supported LTS runtime, or select Node.js 20.x or newer under **Build and Deployment**. The `engines.node` range in `package.json` prevents an incompatible runtime.
5. Deploy. No environment variables are required.
6. Open the production URL and repeat the smoke checks above.

Vercel will create preview deployments for subsequent branches or pull requests and a production deployment from the configured production branch.

## Deploy with Netlify

1. Push the repository to a Git provider supported by Netlify.
2. In Netlify, choose **Add new site** and import the repository.
3. Netlify reads `netlify.toml`, which defines `npm run build` and the `dist` publish directory.
4. The committed `.nvmrc` selects Node.js 20.19 for the build. It overrides Netlify's UI version setting, so no separate `NODE_VERSION` is needed.
5. Deploy. No application environment variables are required.
6. Open the generated site URL and repeat the smoke checks above.

## Deploy to another static host

Configure the provider with these values:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Publish/output directory | `dist` |
| Node.js version | `20.19` or a newer compatible LTS release |

Upload the contents of `dist/` if the provider accepts only prebuilt static files. The app currently has no client-side routes, so rewrite rules are not required.

## Custom domain and HTTPS

Add the domain through the hosting provider, then create the DNS records it specifies. Wait for the provider to issue an HTTPS certificate before announcing the URL. Keep automatic HTTP-to-HTTPS redirects enabled.

After DNS is live, test both the apex domain and `www` hostname if both are configured, and choose one canonical redirect target.

## Release and rollback

Use the hosting provider's immutable deployment history for releases:

1. Deploy from a reviewed commit on the production branch.
2. Record the commit SHA with the release or deployment.
3. Run the production smoke checks.
4. If checks fail, immediately promote the last known-good deployment or use the provider's rollback function.
5. Fix the issue in source and redeploy; do not edit generated files in `dist/` by hand.

## Operational notes

- Availability monitoring can check the home page for HTTP 200 and the text `Find the dish`.
- Watch the provider's build logs for dependency or build failures.
- Browser errors are not collected by this prototype. Add a frontend error-monitoring service before a public launch where reliability matters.
- Rating submissions are not persisted. A successful-looking rating confirms only an in-browser state change.
- Review dish, restaurant, pricing, sponsorship, dietary, and allergen data before publishing; all current records are hard-coded seed content.

## Environment variables and secrets

None are needed for the current build. For future backend integrations:

- store secrets in the hosting provider's encrypted server-side environment settings;
- expose only non-sensitive browser configuration with Vite's `VITE_` prefix;
- add variable names and safe examples to `.env.example`;
- document which environments require each value and how key rotation works.

Anything prefixed with `VITE_` is compiled into public JavaScript and must be considered visible to every visitor.

## Provider references

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vite on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Netlify build dependency and Node.js configuration](https://docs.netlify.com/build/configure-builds/manage-dependencies/)
