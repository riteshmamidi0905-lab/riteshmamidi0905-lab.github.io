# Visual prototype preview — not the PR #10 release candidate

This branch's standalone `start-safari-preview.py` verifies and serves website commit `bdf18992bc1162eac6fceaff8abec1e677ed1b6d`.

- Source ZIP SHA-256: `0bdcbe859c850012c983d59555d3c2017955e52e53c6510f9e43234756853281`.
- Artifact tree SHA-256: `197cbbdbaa970dfd596cceb2de614b8fdd88a3693521094e76e0af3c055cd170`.
- 167 public files. All media and four resumes retain approved baseline bytes.

Download the pinned branch launcher supplied in the review handoff and verify its published checksum before executing. Run `python3 start-nasha-preview.py --port 8865` on Mac. It downloads/checks the exact archive, safely extracts it, builds/verifies only public files, and prints the receipt and local URL. No Git or npm needed. Keep Terminal open; Control-C stops it. `--lan --port 8865` enables the same verified payload on trusted private Wi-Fi for iPhone. No public tunnel.

Review arrival, specialist exhibits, business-world and day-inside sections. Normal/reduced-motion and mobile results are separate observations. This is an implemented visual prototype, not a production release or rigged-character upgrade. Baseline Mac 1–8 owner-reported PASS does not transfer. New physical-device evidence is required before release.

PR #10 and its original launcher remain unchanged. Later commits on this prototype branch change only preview tooling, documentation, tests and manifest formatting; the website payload is the pinned commit above.
