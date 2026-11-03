# Release checks: source validation vs publication validation

This file is maintainer documentation. It lives under `scripts/`, which the publication policy never deploys.

## Two layers, two manifests

| Layer | Question | Command | Manifest |
|---|---|---|---|
| Source validation | Are the reviewed site files unchanged, linked correctly and free of prohibited text? | `npm run build && npm test` | `release-files.json` (hash-pinned reviewed files) |
| Publication validation | Does the artifact that would be deployed contain exactly the approved files, and nothing else? | `npm run build:pages` | `scripts/publish-manifest.json` (explicit allowlist) |

`scripts/build-pages-artifact.py` copies only what the publication manifest lists into `dist/` (which must not exist yet; nothing is ever deleted).
It fails if the manifest is not exactly the reviewed release files plus `.nojekyll`, if any listed file differs from its pin or fails the path policy
(`scripts/pages_policy.py`: no scripts, tests, configuration, self-test pages, hidden or secret-like files), or if the output differs from the manifest.
`scripts/verify-pages-artifact.py dist` then re-checks the output independently: exact inventory, cleared screenshots only, every link, stylesheet url()
and fetched file resolves, no prohibited identifier, required pages and honest-status text present, and, served over HTTP, every published file returns
200 while the excluded tooling URLs return 404. `scripts/test-pages-artifact.py` proves the checks fail on tampering (run by `npm test`).

After the reviewed files change: regenerate the pages (`sh scripts/build-all.sh`), then `python3 scripts/build-pages-artifact.py --write-manifest`.

## Disclosure rules (fail-closed, no secrets in Git)

Public rules are salted hashes in `scripts/disclosure-rules.json`, evaluated by `scripts/disclosure.py` over every text file in the repository and in the
artifact. They always run; if the file is missing, malformed or incomplete the release fails. Failures print a rule id, file and line, never the text.

Optional private rules (kept outside the repository) add literals, regexes and withheld file paths:

```json
{"literals": ["..."], "regexes": ["..."], "withheld_files": ["assets/img/..."], "preview_spec": "/path/to/private-figure-list.json"}
```

* Local: `PORTFOLIO_PRIVATE_RULES=/path/to/private-rules.json npm run build` (add `REQUIRE_PRIVATE_RULES=1` to fail when it is not configured).
  If the variable is set the file must exist, parse and define at least one rule, otherwise the check fails.
* CI: neither variable is set. CI runs the public hashed rules only. No secret is used, so pull requests from forks get the same check.
* Add a public rule without writing the term in source: `python3 scripts/disclosure.py hash "TERM"`, then add an entry to the rules file.
  Hashes are not secrecy; never put a credential or a long private value in a rule.

## GitHub Pages settings (requires separate authorization)

Pages is currently a legacy build from `main` at `/`. A legacy build publishes the whole repository root as it is, so a workflow change alone cannot
exclude files. The allowlisted artifact takes effect only after the repository's Pages source is switched to **GitHub Actions** (Settings > Pages >
Build and deployment > Source; API: `PUT /repos/{owner}/{repo}/pages` with `build_type=workflow`). Until then, merging publishes everything at the root.
The existing `github-pages` environment is already restricted to `main`. Proposed deploy workflow (not installed; action versions to be confirmed when adopted):

```yaml
name: Deploy to GitHub Pages
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci --ignore-scripts
      - run: npm run build && npm test
      - run: npm run build:pages
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
