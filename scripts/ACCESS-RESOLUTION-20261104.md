# Release access diagnosis and owner procedure — 2026-11-04

Decision remains **NO-GO**. No production deployment, protection change, candidate change or model-evaluation change is authorized by this procedure. Only the disposable repository is used for access repair and destructive rehearsals.

## Confirmed cause of the two HTTP 403 responses

Authenticated user: `riteshmamidi0905-lab` (ID 305971019). The disposable repository `riteshmamidi0905-lab/nasha-pages-rehearsal` is public and owned by that user; repository metadata confirms admin, maintain, push and pull permissions.

`GET /user/installations` identifies installation `166691392`, App `chatgpt-codex-connector` (App ID 1144995), selected for all repositories, not suspended. The recorded App grant is:

| Permission | Grant |
|---|---|
| Actions | write |
| Contents | write |
| Workflows | write |
| Issues / Pull requests | write |
| Checks / Statuses / Metadata | read |
| Pages / Administration / Deployments | absent |

The authenticated owner's repository role is not the same as the App's delegated authority. The owner role is sufficient, but the App-backed credential lacks the endpoint permissions. Actions write enables rerun/dispatch; it does not imply Pages administration or reviewer-decision access. Empty OAuth-scope response headers are consistent with fine-grained App authorization and are not evidence of an expired token or a missing classic repo scope.

| Denied operation | GitHub requirement | Proven missing grant |
|---|---|---|
| PUT `/repos/OWNER/REPO/pages` | Pages write AND Administration write, with a permitted repository role | Both Pages and Administration absent |
| POST `/repos/OWNER/REPO/actions/runs/RUN_ID/pending_deployments` | Deployments write AND eligibility as a required reviewer | Deployments absent |

Reviewer eligibility was independently observed as `current_user_can_approve: true` in the saved waiting-run response. Current environment readback still lists the owner as required reviewer, self-review allowed, admin bypass disabled, and main as the sole permitted deployment branch. The public repository and existing reviewer rule do not show a plan restriction. No environment protection change is needed to resolve either credential denial.

The installation lookup endpoint `/repos/OWNER/REPO/installation` returned HTTP 401 requiring an App JWT. That endpoint is an App-authentication endpoint; its failure with a user credential does not mean the owner login is invalid. `/user`, `/user/installations`, repository metadata and environment reads succeeded. No credential content was inspected or printed.

Sources: [Pages update requirements](https://docs.github.com/en/rest/pages/pages#update-information-about-a-github-pages-site), [pending-deployment review requirements](https://docs.github.com/en/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run), [installed App permissions](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps).

## What can be corrected with current access

The required grants cannot be self-assigned by this session. GitHub App permission changes originate from the App registration owner and must then be approved by the installation owner. A repository owner can change repository selection or approve requested updates, but cannot arbitrarily add permissions that this third-party App does not request. Reconnecting the same unchanged grant is not a demonstrated remedy.

Do not disable reviewers, enable bypass, change production workflow permissions, or substitute a workflow GITHUB_TOKEN for the owner's reviewer identity. Do not confuse custom deployment-protection-rule callbacks with the human-review endpoint.

## Owner path A — use GitHub directly, without sharing credentials

1. Sign in to GitHub as `riteshmamidi0905-lab`. Work only in [the disposable repository](https://github.com/riteshmamidi0905-lab/nasha-pages-rehearsal).
2. Verify [Settings → Environments → github-pages](https://github.com/riteshmamidi0905-lab/nasha-pages-rehearsal/settings/environments) still requires the owner reviewer, permits only main, and has admin bypass disabled. Keep these settings.
3. For source changes, use [Settings → Pages](https://github.com/riteshmamidi0905-lab/nasha-pages-rehearsal/settings/pages). Source controls are under Build and deployment. Use only the staged disposable fixture and coordinated rehearsal sequence below; do not switch an arbitrary tooling-containing branch to legacy publishing. No Pages setting in production should be changed.
4. For reviewer decisions, use [Actions](https://github.com/riteshmamidi0905-lab/nasha-pages-rehearsal/actions) → the specifically staged rehearsal run → Review deployments → select github-pages → Reject or Approve according to the scenario. Verify the repository and run SHA before acting. This is an ordinary required-reviewer decision, not an administrative bypass.
5. There is currently no newly staged review to act on. The previous negative run [41884575264](https://github.com/riteshmamidi0905-lab/nasha-pages-rehearsal/actions/runs/41884575264) was cancelled. Once ready to coordinate the owner action, retry its current deploy job (last recorded job ID `126766932319`, attempt 1), rechecking the latest attempt first. Prefer a deploy-only retry to reuse the already verified artifact. A stale job ID may be refused if another attempt has since occurred.
6. Reject the first fresh disposable review to exercise the rejection path. After evidence confirms deployment failure and absence of a release record, a subsequent deploy-only retry must reach another owner review. Approval of that later disposable-only review permits the intentionally wrong verification path to execute. It is not permission to approve production.

## Owner path B — a narrowly scoped credential, if agent-operated APIs are desired

Use [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new):

1. Resource owner: `riteshmamidi0905-lab`; short expiration appropriate to this rehearsal, preferably one day.
2. Repository access: **Only select repositories**, select **nasha-pages-rehearsal only**. Do not include the production repository or select all repositories.
3. Repository permissions: **Pages read/write**, **Administration read/write**, **Deployments read/write**, **Actions read/write**, **Contents read-only**; Metadata read is automatic. No Issues, Pull requests, Workflows, organization/account administration or repository-deletion grant is needed for these API operations. Existing connector access can continue to perform authorized source edits.
4. Store it using a credential manager or an approved runtime secret binding. Never paste its value into chat, commit it, print it, place it in a command argument or put it in a run log. If no secure runtime handoff exists, use owner path A or execute the scoped administration calls from the owner's local terminal instead.
5. Keep it separate from the injected connector credential; select it for disposable-repository commands only. First verify user identity and endpoint-specific permission evidence, then perform one controlled disposable operation. Do not repeat known-denied mutations before the authentication context changes.
6. Remove the temporary credential after the rehearsals. Existing production credentials and protections remain unchanged.

Alternative App route: review [the installed App](https://github.com/settings/installations/166691392). If its publisher has requested new permissions, the owner may inspect and approve the exact required changes. No such pending upgrade is established by current evidence. The current installation covers all repositories, so a broad App upgrade could also expand production access; the disposable-only credential or direct owner UI is the narrower option.

Sources: [fine-grained token setup](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [App permission updates](https://docs.github.com/en/apps/using-github-apps/approving-updated-permissions-for-a-github-app).

## Rehearsal sequence after access is available

1. Preserve disposable settings, current main SHA/tree, existing artifacts and successful release records. Record all timestamps, workflow/run/attempt IDs, job and step conclusions, reviewer decisions and refusal messages. No evidence deletion is needed.
2. **Source transition:** stage a minimal safe main-branch fixture in the disposable repository using normal commits, preserving a restoration commit/tree. It must contain only a harmless HTML page and nojekyll plus hidden workflow definitions; no tooling or private files may be exposed by legacy publishing. Keep the owner reviewer, main-only restriction and disabled bypass. Configure legacy publishing from that safe main tree, observe any required review normally, and record the served fixture's bytes and hashes. Dispatch the main-only source guard while source is legacy: require guard failure, downstream skips and no release record. Switch the disposable source to Actions and compare the fixture repeatedly through the transition. Record observed interruption or continuity honestly; a later successful fetch cannot prove there was no transient outage. Restore the original disposable workflow tree through normal commits and confirm source is workflow. Do not perform this migration on production.
3. **Rejected deployment:** stage the existing isolated negative candidate, confirm the original 49-file artifact, reject the disposable environment review, and verify deploy fails, downstream verification/recording do not succeed, and no release record exists.
4. **Failed live verification:** rerun the deploy job, require a fresh review, and approve only the disposable run. Its intentionally nonexistent verification base path must produce deploy success followed by verify-live failure and record-release skip/failure. Inspect the run's artifacts and record absence independently.
5. **Partial reruns:** from the actual failed-verification state, exercise verifier-only and record-job retries where GitHub permits them. Inspect which dependencies actually rerun. No retry may create a successful release record from a failed/skipped/cancelled verification. If deploy reruns, require a fresh owner review; if only verification reruns, do not describe the absence of a new deployment as an approval bypass. Verify attempt provenance through the real rollback evidence gate. An API refusal is a refusal result, not a successful execution.
6. Restore the disposable main tree/source/protections, cancel unused pending runs, verify the intended isolated site state, and retain evidence. Reevaluate release only after these results and physical Safari evidence are available. The production merge and deployment remain prohibited while mandatory blockers persist.

The preceding continuation already passed concurrency supersession, deploy-rerun gate renewal, off-main job skipping, missing-record rollback refusal and local verifier/record-writer failures. Do not redo them except where a new scenario specifically depends on them.

## Physical Safari access and manual checklist

BrowserStack Live and Sauce Labs Live Cross Browser support physical iOS Safari sessions. Product availability is not session access: no matching connected plugin was found, no physical-browser tool is exposed, and no configured BrowserStack/Sauce credentials were found by presence-only checks. No paid service was purchased, no account created, and no physical-device test executed.

A service owner can use an existing account and select an explicitly **real iPhone/iPad + Safari** session. Use the verified candidate artifact through the provider's authenticated Local Testing tunnel to a local HTTP server, or a separately verified existing disposable URL serving that exact artifact. Do not publish an alternate production site. Testing the unchanged production baseline does not test the release candidate. A cloud desktop Safari session with unverified hardware provenance does not establish physical-device coverage.

Recommended test matrix: a physical iPhone and a physical Mac with Safari, plus physical iPad if that form factor is part of the supported release scope. Record every tested combination and leave untested combinations explicit; do not silently claim all Safari versions.

Manual checks:

1. Verify the artifact is the authorized head's 49-file publication with the expected digest. Record the local/tunnel or disposable URL and its mapping to that artifact.
2. Open the home page and every published HTML page. Check portrait/landscape and narrow/desktop layouts: readable text, loaded fonts/images, working links, no horizontal page overflow, clipped tables or overlapping headers.
3. Test touch navigation, mobile menu open/close, browser back/forward, project search/category filters and empty results. On Mac, test keyboard focus, skip link and menu escape behavior.
4. Exercise the lab architecture/scenario controls and approval-versus-execution separation, including a denied action. Run the synthetic Enterprise Demo guide, its role restrictions and audit verification. Check Data Lab queries and demo-state integration. Confirm no real external operation occurs.
5. Check initial/repeat load, scrolling, reload, reduced-motion setting, storage persistence/reset and the supported no-JavaScript fallback. Record any console/network errors available from Safari Web Inspector; do not claim a clean console if it was not observable.
6. Capture screenshots or video of key pages and interactions, including the smallest tested width and both orientations. Record pass/fail per check, reproduction steps and unresolved defects. Automated axe results do not replace manual Safari observation or establish a human screen-reader pass.

Required evidence: tester and timestamp/timezone; physical device model; OS version; Safari version/build; service session ID plus its real-device designation (or physical-hardware evidence); tested URL; candidate/artifact identity; viewport/orientation; checklist results; screenshots/video references; errors/defects; and an explicit untested-scope statement. Session secrets and credentials must not appear in evidence.

Sources: [BrowserStack Live](https://www.browserstack.com/docs/live), [BrowserStack Local Testing](https://www.browserstack.com/docs/live/local-testing/set-up-local-testing), [Sauce Labs physical-device browser testing](https://docs.saucelabs.com/web-apps/live-testing/live-cross-browser-testing/index.html).

## Disposition

No denied mutation was retried under unchanged permissions. A proposed disposable deploy-job staging action was rejected by automatic approval review because the permission gap was unchanged and another remote rehearsal mutation was unnecessary; no rerun was submitted through a workaround. The owner procedure therefore stages a review only after access or coordinated owner participation is available.

No new live rehearsal was completed in this diagnosis. Mandatory source-transition, rejected-deployment, failed-live-verification and post-failure partial-rerun scenarios remain unexecuted, and physical Safari evidence is absent. The documented decision remains NO-GO. Authorized candidate `6391698c738cab21bc60771b1035240a0c9cbd61`, production baseline and evaluation findings remain unchanged.
