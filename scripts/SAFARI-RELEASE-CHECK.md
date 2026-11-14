# Mac Safari and iPhone Safari release check

These are manual checks of actual Safari. Automated Chromium or Linux WebKit results do not count as Safari/device evidence. Do not approve release if a required check fails or has not been run.

## Open the candidate

From a new directory on your Mac, with Git and Python 3 available:

```sh
git clone --branch release/nasha-phase4-2-rc --single-branch https://github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io.git nasha-release-check
cd nasha-release-check
git rev-parse HEAD
python3 scripts/safari-preview.py --lan
```

The script verifies and serves only the allowlisted public artifact on port 8864. It prints the exact commit and artifact digest; retain those in your results. No backend, credentials, model call or real order is involved. Use a trusted Wi-Fi network, allow the Python server through the Mac firewall if prompted, and stop it with Control-C after testing. No public tunnel is created.

Mac Safari: `http://127.0.0.1:8864/nasha-universe/living-hq/index.html`.

iPhone Safari on the same Wi-Fi: substitute the Mac's LAN IP for `127.0.0.1`. Find that IP in System Settings → Wi-Fi → Details → TCP/IP. The pure SHA-256 verifier supports this HTTP-only local preview; production remains HTTPS. Do not enable insecure-content exceptions or disable browser protections.

## Required checks on each device

1. Headquarters entrance and every navigation control fit without sideways page scrolling. Drag/orbit the 3D scene and use the 2D fallback. Scroll to the character campus; its controls remain clickable.
2. Open all twelve character views, check whole bodies are visible and images load, close with the button (Escape on Mac), and confirm focus returns to the trigger. Mac: navigate with Tab/Shift-Tab and Enter; enable Safari's “Press Tab to highlight each item” keyboard-navigation setting if necessary.
3. Open a recorded mission, Step, Play, Pause, Restart and seek. Check the visible captions, event numbers and agent states change together. Open a character chamber and inspect its role and recorded state. These are 2D illustrations, not rigged models.
4. Pause animations, then turn on the OS Reduce Motion setting. Confirm optional character motion stops and controls remain usable. Restore your original setting afterward. Note visible stutter, overheating or crashes; do not report measured frame rates without measuring them.
5. Open Business Operations. Search Mango; filter Ingredient; check the product results and accessible details. Confirm Gobi is an appetizer. The stock table may scroll inside its labeled region; the whole page must not overflow sideways.
6. As Operator, create a reorder; switch to Reviewer, approve; return to Operator. Simulate receiver outage and attempt receipt: expect a clear blocked message. Recover and receive: expect one increase, verified audit and matching VECTRA/SYNAPSE state. Open another tab to confirm its state starts independently.
7. Submit a discrepant cycle count and reconcile as Reviewer. Confirm the displayed stock and audit update. Test an empty/negative quantity: expect refusal and unchanged stock.
8. Open all five engineering case studies. Check diagrams and captions, then Play/Pause, Next step and Restart. The original trace stays intact; no paid model API is used. Select stages in the operations architecture and confirm the explanation updates.
9. Open all three resume PDFs; check they render legibly and that download/save works. Confirm they describe independent projects separately and Apple Maps as a client engagement.
10. If available, enable VoiceOver, check the page title, navigation, image labels, dialog names, focus order and status announcements. Record which assistive-technology checks you actually completed.

Video playback is **N/A**: the publication policy excludes video files and HTML video. The site uses captioned recorded-event replay instead. Do not claim an MP4 test passed.

## Return this evidence

- Candidate commit and artifact tree digest from the preview receipt.
- Mac model, macOS version and Safari version; iPhone model and iOS/Safari version.
- Per-device PASS/FAIL/NOT_RUN for checks 1–10, plus any exact failure and reproduction steps. Do not treat an omitted test as a pass.
- One screenshot of headquarters, one of an open character and one of inventory after outage/recovery, per device. Include the visible state/caption, but keep unrelated tabs or personal information out.
- A short screen recording on each device showing navigation → character → recorded mission captions → outage/recovery, if practical. Screenshots alone do not prove animation or interaction.
- Identify whether keyboard/VoiceOver and both normal/reduced motion were actually tested. Report manual performance observations separately from automated Lighthouse scores.

No physical Safari or iPhone pass may be entered in release evidence until these results are received and reviewed. A screenshot without the candidate identity does not establish which version was tested.
