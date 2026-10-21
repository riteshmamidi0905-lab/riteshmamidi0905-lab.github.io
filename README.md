# Ritesh Mamidi — cinematic portfolio

Static GitHub Pages portfolio with 24 projects, six flagship builds, NASHA architecture and a recruiter brief. NASHA interactions use synthetic data and perform no external actions.

The reviewed HTML/CSS/JS are the source of truth. `npm run build` validates the release manifest without regenerating the design.

Validation: `npm ci --ignore-scripts`, `npm test`, then serve the root on port 8000 and run `npm run test:browser` with Chromium.

GitHub Pages publishes `main` from the repository root. Revert releases through a normal PR; never restore restricted historical assets.
