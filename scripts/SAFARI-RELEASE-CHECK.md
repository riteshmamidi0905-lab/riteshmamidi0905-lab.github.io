# Physical Mac and iPhone Safari release validation

Actual Safari evidence is required. Chromium and Linux WebKit are separate tests. Do not approve a release with a mandatory FAIL or NOT_RUN. Test the final approved candidate; an earlier commit's results do not transfer automatically.

## Current living-enterprise candidate

This branch extends preserved PR #11 through the separate living-enterprise PR. Do not use the historical PR #11 source commit or archive pins for this new payload. The current draft PR description and final handoff provide the exact validated head, launcher SHA-256, source ZIP SHA-256 and artifact tree digest.

The public inventory is 170 files (169 reviewed files plus .nojekyll). Expected tree digest: `253ca40b1f1ed7a3308925209b5bb7d1a427012c374ca4769c7ad6e53089662a` for this payload. Tooling-only continuations must prove the public manifest is unchanged.

## Start the verified local preview on your Mac

Use the single checksum-verified curl command supplied in the final handoff. The launcher requires explicit --commit, --archive-sha256, --tree-sha256, --files and --pr-number values; no default earlier candidate is accepted. It verifies current PR head before/after building, the source archive before extraction, and the complete allowlisted artifact before serving.

Use port 8867 to keep this preview distinct from an earlier PR #11 preview on 8865. Keep Terminal open. Stop with Control-C. macOS downloads use certificate-verified system curl, HTTPS-only redirects and curlrc disabled. Do not disable TLS verification. --archive supports the same pinned source ZIP without a Python HTTPS download. The current-head check remains mandatory.

The receipt must name the living-enterprise PR and exact source head, 170 files, matching tree digest, PASSED publication validation and localhost_only true for the initial Mac run.

After the Mac checks, stop and rerun the same fully pinned command with --lan, using trusted private Wi-Fi. The launcher prints the actual iPhone URL and binds only loopback plus a validated private address. No public tunnel. Record actual device model/OS/Safari versions and the receipt; no serial numbers needed.

## Final-candidate evidence scope

All fifteen checks below must be repeated on both devices. Earlier PR #10 or #11 observations do not transfer. Current status: **AWAITING OWNER DEVICE VALIDATION**. Group 1–4 (arrival), 5–8 (specialists/replays/motion), 9–12 (business/workflows), 13–15 (career/accessibility/performance); retain an individual PASS/FAIL/NOT_RUN for every number.

Additional living-enterprise checks within those groups:

- 5–8: inspect NOVARA's mounted artwork and all twelve specialist work records. The scene source must distinguish living simulation from recorded evidence. Check play/pause/replay and reduced motion; artwork remains 2D/2.5D.
- 9: founder study exterior/day/golden/evening, courtyard and interior focus controls keep one consistent building. They are labeled procedural concepts, not actual photographs or a full 3D walkthrough. Approved menu/media remain intact.
- 10–12: step the eighteen-event shared mission. Autoplay stops for explicit Reviewer approval; Operator cannot approve, Observer cannot mutate. Outage receipt leaves stock/audit unchanged; retry adds nothing. Six ledger rows across three days balance. Final mango=26 stock units, beer=27 serving units. Switching perspectives/replaying must not change the live history; same-tab HQ/business navigation restores it. The original manual inventory and eight-step fixture remain separate and must still work.
- 13: inspect independent FDE/applied-AI evidence and source links. No live LLM, commercial operations or professional FDE title is claimed.

## Fifteen checks on each device

Record PASS / FAIL / NOT_RUN separately for Mac and iPhone, with exact reproduction steps for failures.

1. **Home and recruiter route:** home renders; modes, contact, verified employment and independent projects are easy to find. Entire page does not overflow sideways.
2. **Cinematic opening:** opt into Play cinematic intro; inspect all eight presentation scenes. No audio autoplays. On reduced motion or low power, manual Next works without forced camera flights.
3. **Skip and pause:** Skip Intro and Escape (Mac) exit promptly. Pause automatic progression stops advancing. Normal navigation leaves the intro. Controls remain visible on iPhone.
4. **Interactive headquarters:** Enter interactive 3D; drag/orbit, zoom and reset. A screenshot alone is not a WebGL test. Test the accessible 2D alternative; record activation delay and any crashes separately from page-load scores.
5. **Departments:** all thirteen destination buttons work, identify the district, and open the correct enterprise workspace. Shared procedural spaces are explicitly described.
6. **Twelve characters:** open all twelve full-body designs, inspect role, responsibilities and state. Close returns focus. Select each of the ten motion-study states on at least one character; studies are explicitly simulated and do not alter recorded events. Body, hands and feet remain visible in the full character view.
7. **Recorded workflows:** load a mission; step, play, pause, restart and seek. Captions, event numbers, agent states and architecture change together. Verify a failure and recovery recording. No live autonomous system is claimed.
8. **Motion accessibility:** pause character/global animation; enable OS Reduce Motion and verify optional motion stops. Restore your original setting. Report stutter, heating and battery observations honestly; do not invent FPS.
9. **Business imagery:** inspect the brewery showcase and confirm NASHA is a proposed business, not operating commercially. All nine approved concepts load; Gobi is an appetizer. Search Mango, filter Ingredient and open product details. Scroll the stock table within its own region without page overflow.
10. **Approvals, idempotency and recovery:** complete all eight actions in A Day Inside NASHA AI, switching between Business, AI systems and Engineering views without changing scenario state. Confirm the outage attempt is blocked and duplicate retry leaves mango at 60 with six audit events. Confirm this scenario does not change the inventory workspace. Then in the full workspace: Operator creates reorder; Reviewer approves; Operator simulates outage and tries receipt (blocked); recover and retry (one increase). Inspect audit and matching agent states. Another tab starts isolated.
11. **Reconciliation and errors:** submit discrepant count, reconcile as Reviewer; stock and audit update. Empty/negative quantity is refused without stock changes. Observer cannot mutate stock.
12. **Enterprise console:** retrieve inventory policy with versioned source; unknown question abstains. Run retrieval development checks. CSV sample accepts two rows, quarantines two and reconciles 19,580 cents. Monitoring follows outage/recovery. BI and three-day demand are labeled synthetic/heuristic.
13. **Engineering evidence and resumes:** all five cases, diagrams and captioned trace controls work; the master and all three tailored resume PDFs open, render and save. Apple Maps is a client engagement; independent projects are separate.
14. **Keyboard, VoiceOver and downloads:** Mac Tab/Shift-Tab/Enter/Escape work (enable Safari keyboard navigation if needed); test VoiceOver where available and record what was actually used. Dialogs are named and focus returns. Touch controls remain operable on iPhone.
15. **Network, console, performance and avatar:** record failed requests and JS errors using Mac Safari Web Inspector. For iPhone, use USB/Web Inspector if available; otherwise mark console inspection NOT_RUN. Record navigation/interaction delays and visible defects. Test the approved integrated avatar: welcome/topic links, portrait Play/Pause, reduced-motion still and optional on-device narration with no autoplay audio. It uses animated WebP; private likeness previews alone do not prove public integration. Current publication policy excludes native video/audio; captioned event replays are tested above. Do not mark a public MP4 test passed when no MP4 is in the artifact.

## Evidence to return

- Candidate commit and artifact tree digest.
- Mac model, macOS and Safari versions; iPhone model and iOS/Safari versions. No serial numbers needed.
- Per-device results for all fifteen checks, with omissions explicitly NOT_RUN.
- Per-device screenshots: headquarters, selected character and inventory after recovery. Exclude unrelated tabs or private information.
- A short screen recording of intro → skip → department → character → recorded captions → outage/recovery, if practical. Screenshots alone do not prove animation.
- Exact console/network errors; indicate if console inspection was unavailable.
- Normal and reduced-motion results; keyboard/VoiceOver used; manual performance observations separately from automated Lighthouse.

No physical-device PASS may enter release evidence until the actual results have been received and reviewed. Avatar likeness and protected release approvals remain separate decisions.
