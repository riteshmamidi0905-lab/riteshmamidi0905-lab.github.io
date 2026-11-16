# Secure current-head living-enterprise preview

This branch's launcher never silently serves the previous PR #11 baseline. Use the exact current-head command and checksum values from the draft living-enterprise PR description/final handoff. Do not use older prototype launcher pins.

Required flags: --commit (40 hex), --archive-sha256 (64 hex), --tree-sha256 (64 hex), --files 170, --pr-number, and optionally --archive with that exact ZIP. The PR current-head check runs before/after public artifact preparation. A changed head, invalid archive, mismatched tree/inventory, traversal, symlink or unavailable port refuses startup.

macOS uses /usr/bin/curl with verification enabled, curlrc disabled, HTTPS-only protocols/redirects and timeouts. No insecure TLS option or context is used. Downloading the pinned ZIP with verified curl and passing --archive avoids Python's HTTPS certificate configuration for the source download. The PR metadata check also uses system curl on Mac.

Use --port 8867 for this new candidate, leaving earlier 8865 previews distinguishable. Initial Mac serving is loopback-only. After Mac validation, the same fully pinned invocation with --lan enables only the validated private Wi-Fi address for iPhone. No public tunnel or repository-root serving.

The original owner-reported Python CERTIFICATE_VERIFY_FAILED was a trust-validation failure; the exact missing CA/chain cause on that Mac was not independently determined. This branch preserves the secure transport correction and all hash/publication boundary checks. Actual physical Mac/iPhone results remain separate from Linux/automated WebKit verification.

See SAFARI-RELEASE-CHECK.md for all fifteen per-device checks and LIVING-ENTERPRISE-SCOPE.md for implementation boundaries. No prior candidate's device PASS transfers automatically.
