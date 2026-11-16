# Physical Mac and iPhone Safari release validation

Actual Safari evidence is required. Chromium and Linux WebKit are separate tests. Do not approve a release with a mandatory FAIL or NOT_RUN. Test the final approved candidate; an earlier commit's results do not transfer automatically.

## Start the verified local preview on your Mac

Use the checksum-pinned launcher command in the final release handoff. The launcher downloads website commit `bdf18992bc1162eac6fceaff8abec1e677ed1b6d`, verifies the source ZIP before extraction and independently verifies all 167 public files. Later tooling-only commits do not change this public payload.

Expected artifact tree digest: `197cbbdbaa970dfd596cceb2de614b8fdd88a3693521094e76e0af3c055cd170`.

Save the supplied launcher as `nasha-preview.py`. Run:

```sh
python3 "$HOME/Downloads/nasha-preview.py" --port 8865
```

Mac Safari: `http://127.0.0.1:8865/nasha-universe/living-hq/`. Keep Terminal open. Stop with Control-C. Do not disable TLS verification. macOS uses system curl for the source download, avoiding dependence on a separately installed Python CA bundle; the source and artifact SHA-256 gates still apply. If curl also fails, report its exact error; do not bypass it.

After completing the Mac checks, restart the same launcher:

```sh
python3 "$HOME/Downloads/nasha-preview.py" --lan --port 8865
```

Use the actual iPhone URL it prints. Both devices must use trusted private Wi-Fi. The server binds only loopback and a validated private Wi-Fi address. No public tunnel or security exception is needed. No existing server is killed or overwritten.

## Final-candidate evidence scope

The owner approved PR #11's creative direction. Baseline PR #10 Mac Checks 1–8 are owner-reported PASS, not independent verification. They do not transfer: the arrival, architecture, character presentation, business showcase and signature scenario changed. Repeat all fifteen checks on both devices for this final payload; current status is **AWAITING OWNER DEVICE VALIDATION**. Device model/OS/Safari versions and the printed candidate receipt are required before accepting results.

Group checks 1–4 (arrival), 5–8 (departments/characters/replays/motion), 9–12 (business/controlled workflows), and 13–15 (evidence/accessibility/performance). Preserve a separate PASS/FAIL/NOT_RUN result for each number; grouping does not waive a check.

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
