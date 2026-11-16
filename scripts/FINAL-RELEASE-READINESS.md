# NASHA final release readiness

## Candidate and owner decisions

PR #10 is the preserved engineering baseline at `3dbd5f38a960b2bf840cdbe6900b9dcf9d8eb655`. PR #11's creative direction was explicitly approved in the owner's final execution directive. That approval is recorded as a creative decision, not physical-device certification. No further routine creative approval is requested.

The public website payload remains `bdf18992bc1162eac6fceaff8abec1e677ed1b6d`. Later commits only affect preview tooling, regression tests and release documentation. The final tooling head must have its own CI result before merge.

- Publication manifest: `scripts/publish-manifest.json`.
- Public files: 167; total bytes: 7,260,676.
- Artifact tree SHA-256: `197cbbdbaa970dfd596cceb2de614b8fdd88a3693521094e76e0af3c055cd170`.
- Source ZIP SHA-256: `0bdcbe859c850012c983d59555d3c2017955e52e53c6510f9e43234756853281`.
- Approved image files and all four resumes retain baseline bytes.

## Evidence and limits

The complete CI run `43780379929` passed on head `06d041474898a94e074af5ab6a1cad608e1c4d37`: source/disclosure integrity, unit and negative-control tests, dependency audit, publication boundary, fourteen browser commands, accessibility and mobile/desktop Lighthouse gates for six routes. The launcher certificate correction and final tooling head require a new CI run.

The preview had a real owner-reported Python TLS certificate validation failure after the launcher checksum passed. macOS now downloads through system curl with verification enabled, curlrc disabled, HTTPS-only protocols/redirects and unchanged source/artifact SHA-256 gates. The command path was exercised with a freshly downloaded source ZIP on Linux while Python HTTPS was deliberately unavailable. The owner's Mac startup is still awaiting confirmation. The exact missing local CA or chain cause was not independently established.

All Python workflow test counts shown in case studies remain existing recorded evidence. Those service sources are not present in this static-site checkout; no fresh Python service execution is claimed. Browser model/UI tests execute the actual website logic. Static audit hash chains and role selectors are demonstration controls, not adversarial server authentication.

Architecture remains procedural WebGL with accessible 2D routes. Character art remains approved 2D/2.5D presentation, not new rigged models. Business imagery is fictional concept art. Demand is a deterministic heuristic, retrieval is authored/grounded, and the signature scenario uses no live inference or supplier API.

## Gate status

| Gate | Status |
| --- | --- |
| Creative direction | COMPLETE — owner approved PR #11 |
| Baseline integration and approved assets | VERIFIED — baseline and image/resume bytes preserved |
| Public website payload CI | VERIFIED — run 43780379929 |
| Final tooling-head CI | REQUIRED — verify the new run before release |
| Mac preview startup after certificate correction | AWAITING OWNER ACTION |
| Final-payload Mac Safari 1–15 | AWAITING OWNER DEVICE VALIDATION |
| Final-payload iPhone Safari 1–15 | AWAITING OWNER DEVICE VALIDATION |
| Baseline Mac 1–8 | Owner-reported PASS; not transferred |
| Protected integration/merge | NOT STARTED — blocked by device evidence |
| Production environment review | NOT STARTED — retained; cannot approve on owner's behalf |
| Public deployment/live verification/release record | NOT STARTED |
| Final live-URL LinkedIn announcement | NOT STARTED — publication requires owner review |

## Required remaining sequence

1. Obtain the actual final-candidate Mac startup receipt and device metadata.
2. Complete all fifteen official checks on Mac, then iPhone, using grouped instructions in SAFARI-RELEASE-CHECK.md. Keep individual PASS/FAIL/NOT_RUN values and relevant evidence. Any failure is investigated before release.
3. Review results against the frozen manifest and final successful CI. Do not silently waive an untested mandatory check.
4. Only after gates pass, integrate the approved visual branch through the established protected PR path. Updating PR #10 as part of that release integration is authorized; routine redesign has not modified it. Resolve conflicts explicitly and rerun required checks. Do not merge unrelated branches.
5. Preserve the GitHub production-environment reviewer decision. Deploy only via the established allowlisted Pages workflow.
6. Verify live HTTPS pages, all 167 published files/asset hashes, excluded tooling URLs, all four PDF downloads and final release record. Report the deployed main commit and run only after they succeed.
7. Finalize launch materials with the verified deployed URL; never publish LinkedIn automatically. Shift focus to realistic job applications after launch.
