# ELI Guidance Lab

Private, browser-local ELI Desk prototype. No dependencies, external requests, real records, or backend.

## Reuse the add-on

Copy `dist/spotlight-tour.js` and `dist/spotlight-tour.css` into a host application, import the class, and pass the host root and step configuration:

```js
import { SpotlightTour } from './spotlight-tour.js';

const tour = new SpotlightTour({
  appRoot: '#app',
  steps: [
    {
      target: '[data-tour="feature"]',
      title: 'A short title.',
      description: 'One useful explanation.',
      placement: 'right',
    },
  ],
  onClose: ({ reason, step }) => console.info(reason, step),
});

tour.start();
// tour.close(); closes without completing.
// tour.start(); restarts from the first step.
```

Targets can be selectors or functions returning an element. Placements: right, bottom, top, left. The engine selects another side if needed. Missing/hidden targets are skipped. Controls include previous, next, direct step selection, restart, skip, close, Escape, and arrow keys. Focus is trapped in the dialog and restored on exit; the host is inert while the tour runs. An optional storageKey records the closing status, but does not prevent a later restart. Host mutations exist in memory only.

Serve `dist/` using a static HTTP server to run locally. Production access is controlled by Sites and must remain owner-private unless the user explicitly authorizes a change.

## Soft-focus treatment

The overlay uses a self-contained SVG alpha mask to feather the aperture across both the dark backdrop and its blur. The mask moves with eased interpolation; explanatory cards and the exit use short fades. No visible outline is drawn around the focused element. Reduced motion is respected.

## Cloudflare Workers deployment

The repository contains prebuilt static files in `dist/`; no build command is needed.

- Git repository: `manoconsultora/guidance_StepByStep`.
- Production branch: `feat/eli-guidance-demo`.
- Root directory: `/`.
- Build command: leave empty.
- Deploy command: `npx wrangler deploy`.
- Worker name: `guidance-stepbystep`, matching `wrangler.jsonc`.

The Wrangler configuration explicitly disables the automatic `workers.dev` and version URLs. Configure a protected route with Cloudflare Access before exposing this demo. A successful asset deployment alone does not configure authenticated access.

After connecting Git, pushes to the configured production branch should start a new build. If Cloudflare still reports that the Git account is disconnected, inspect the Cloudflare GitHub App installation and its repository access rather than repeatedly disconnecting the project.

The Cloudflare GitHub App must have access to this repository. After fixing repository permissions, push a new commit on the configured production branch to verify that the build trigger is working.
