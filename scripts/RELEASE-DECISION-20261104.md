# NASHA AI Lab release decision — 2026-11-04

Decision: **NO-GO for squash merge under the current release requirements.** No production deployment is authorized.

This assessment continues the completed verification checkpoint. It does not regenerate the site, change the authorized candidate, reinterpret passing portfolio checks as model-evaluation success, or waive an unmet requirement because access is unavailable.

## Immutable release references

* Repository: `riteshmamidi0905-lab/riteshmamidi0905-lab.github.io`; PR #6, base `main`.
* Authorized head: `6391698c738cab21bc60771b1035240a0c9cbd61`.
* Production main: `783ba6464e20ebf064da4448c94d5461fb358ab4`.
* Publication: 49 files, 1,791,138 bytes; tree SHA-256 `fc71be319008b783e8e72a0ad6857975cc50b9eb4322d7f3d13f8a19b122b056`.
* Assessment and runbook corrections are prepared separately on `docs/release-verification-20261104`; they do not change PR #6.

## Risk classification

Categories can overlap: an access limitation explains why evidence is absent, but does not satisfy the underlying mandatory requirement.

| Risk | Classification | Evidence and release effect | Closure |
|---|---|---|---|
| Physical Safari testing | Mandatory blocker; access limitation | Required physical-device coverage has not occurred. Existing Chromium, responsive and accessibility checks are passing mitigations, not Safari evidence. No physical-browser tool or Apple device service is exposed; environment remains Linux with no configured device capability. | Test the unchanged artifact on physical Apple hardware, record device/OS/Safari versions, routes and responsive interactions, and report actual results. An emulator or WebKit run does not close this requirement. |
| Live deployment-failure rehearsal | Mandatory blocker; access limitation | Disposable run `41884575264` passed guard/build and reached the reviewer gate. The reviewer-decision POST returned HTTP 403, so deployment and failed live verification were not exercised. The cancelled run has no release record. Local fault tests and the real record writer fail closed, but do not establish the full GitHub path. | Supply access able to submit disposable-environment reviewer decisions; exercise failed/rejected deployment and successful isolated deployment followed by failed verification. Check every job/step, artifact inventory and absence of a release record. |
| Live Pages source-transition / legacy-source rehearsal | Access limitation leaving an explicit rehearsal requirement unresolved; mandatory blocker under the current instructions | Disposable Pages settings PUT returned HTTP 403; source remained workflow. The exact candidate guard locally rejects legacy/empty/unexpected responses. Production already uses workflow and its legacy content matched the captured baseline after the actual transition; this is evidence against current root-publication exposure, not a completed negative legacy-source rehearsal or a measurement of transition downtime. | Use Pages administration access in the disposable repository, preserve only the minimal safe fixture as a legacy source, execute the real guard failure, inspect skipped downstream jobs and restore Actions. Never switch production back to legacy for this test. |
| Partial reruns after failed live verification | Mandatory blocker; access limitation | Current-attempt deploy-only retry `41883714882` attempt 2 required a fresh reviewer gate. Old-attempt retry was refused. Supersession passed. Those results do not establish record/verification behavior after a genuine failed live verification; the needed initial state is blocked by deployment-review HTTP 403. | After the isolated failed-verification scenario, exercise verification and record-job retries, checking attempt provenance and ensuring no success record can be produced from failed/skipped/cancelled verification. |
| First production workflow run | Acceptable residual risk for a future merge only; mandatory post-merge checkpoint before deployment approval | A first production run cannot be established by claiming the disposable workflow is production. The unchanged workflow builds and uploads before its protected deploy job. Existing disposable deployments/rollback, exact artifact evidence, main-only controls and the reviewer gate reduce risk. This does not permit merging while the mandatory blockers above remain. | After an otherwise eligible expected-head squash merge, inspect the production guard/build, independently verify the uploaded artifact, and confirm deploy is waiting for the owner. A failed build stops the release; no approval or alternate deployment is permitted. |
| Contradictory or historical runbook statements | Documentation issue | Reconciled on the separate documentation branch with historical observations distinguished from current evidence, blocked scenarios and local-only checks. The authorized candidate retains its historical documentation. | Review the separate documentation changes. Do not silently merge them into or alter the authorized release head. |
| Public preview history | Owner-accepted residual risk | The owner explicitly accepted existing public preview history for this release. Cached/public commits remain accessible; closing a PR would not erase them. | No history deletion or private-media publication is authorized. |
| First-release recovery without a prior Actions release record | Residual risk with an evidence-based recovery procedure | Recovery tag resolves to the production baseline; baseline matches were captured; isolated squash/revert restored the exact Git tree and the original validator passed. There is no prior production Actions release to fabricate or automatically roll back to. | Use the documented revert-through-PR recovery procedure if needed, verify the baseline tree before any separately authorized return to legacy, and preserve evidence. No recovery deployment is authorized by this assessment. |

No new risk exception is inferred. The first-run assessment describes a guarded future merge, not acceptance of production deployment risk. Serving continuity during the earlier source transition remains unmeasured; the present unchanged-site baseline does not prove there was no interruption.

## Final accessible verification

A fresh read-only GitHub assessment confirmed:

* PR #6 is open, not merged, mergeable, on the authorized head and targeting main. Both validate check runs succeeded.
* Production main remains the baseline SHA.
* Production Pages build_type is workflow.
* The main ruleset is active, requires pull requests and strict current validate checks, blocks deletion and force pushes, and has no bypass actors.
* The github-pages environment requires the owner reviewer, allows only main and disables admin bypass. Self-review remains allowed for the sole owner as previously documented.
* The previously downloaded Actions artifact is preserved byte-for-byte: ZIP SHA-256 `83bc5629c0fc284c88c8d6312185719f241915769e9da8e5ae5e6c77e7191cb8`. The independent prior inspection established the exact 49-file authorized manifest, byte count and tree digest, with no duplicate paths, extra files or symlinks. ZIP digest and publication tree digest are different measurements.
* The original 98 candidate source files were compared to the authorized commit at the preceding checkpoint. No subsequent candidate modification occurred.
* Physical-browser tool discovery still exposes no physical Safari/device service. Runtime configuration exposes no new credential or outbound-identity binding that would justify retrying the denied operations. Denied Pages/reviewer mutations were not repeated.

Passed build, security/disclosure, dependency audit, responsive/accessibility, unit, workflow-security, release-evidence, rollback-guard, paint and font-matrix results from the previous checkpoint are retained. They were not rerun without a change requiring them. See FIRST-DEPLOYMENT.md and ROLLBACK-REHEARSAL.md for scope and run IDs.

## Execution disposition and next decision

No merge was attempted because mandatory requirements remain unresolved. Production main is unchanged, and no production deployment or owner approval was initiated. The isolated workflow was restored and all rehearsal runs ended with no pending approval; no release evidence was deleted and no safeguard was weakened.

The existing expected-head squash-merge authorization remains conditional and applies only to the unchanged authorized head. Once mandatory evidence is complete, refresh live merge prerequisites and use an operation that enforces that head. Any head change requires renewed authorization.

Next needed: a GitHub connection with disposable Pages administration and deployment reviewer-decision permissions, plus access to physical Safari hardware. These are capability/evidence blockers, not a need to reauthorize routine tests. If the owner instead wants to change the release requirements, that requires an explicit scoped decision identifying each unverified requirement accepted and its residual risk; this report grants no such exception. Production deployment always requires separate explicit authorization after merge/build evidence and the owner gate are verified.

Existing model-evaluation findings remain unchanged. Passing portfolio checks do not establish model-evaluation acceptance.
