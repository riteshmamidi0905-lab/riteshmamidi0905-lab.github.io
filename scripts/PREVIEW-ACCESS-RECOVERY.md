# Open the exact candidate on your own Mac — no Git required

A server started in the Codex Linux cloud workspace cannot be reached using your Mac's localhost. The Mac must start its own server, or use an authenticated hosted preview of the exact candidate. No existing hosted NASHA preview URL currently serves this candidate.

The standalone `scripts/start-safari-preview.py` launcher uses Python 3 standard-library tools. It downloads the exact GitHub source ZIP, verifies its SHA-256 before extracting, rejects traversal and symlink archive members, builds only the 167 allowlisted website files, independently verifies the artifact and prints its identity before serving it. It does not invoke Git or expose source/private folders.

Exact website candidate: `7cb3bd502f6959e775e8e81ec2c51597cc05ee7f`.
Source ZIP: https://codeload.github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/zip/7cb3bd502f6959e775e8e81ec2c51597cc05ee7f
Source ZIP size: 4,634,436 bytes; SHA-256: `c6efa10a248d3dabea07ad8b9dfbd319632e49e6bdc77f44000ebfb73562e6d0`.
Expected artifact tree digest: `0f5100abd58e70080749fe3f02afc106c93e0fd9463f9eca342684660b61c4d8`.

## Start on Mac

Download the launcher from the pinned source link provided with the handoff. In Mac Terminal:

```sh
python3 "$HOME/Downloads/start-nasha-preview.py"
```

No Git or npm installation is needed. Python 3 must be available. If it is missing or any command fails, report the exact Terminal error; do not substitute a cloud URL or disable browser security.

Confirm PUBLICATION VALIDATION PASSED and the expected candidate/digest in the receipt. Open Safari:
`http://127.0.0.1:8864/nasha-universe/living-hq/`.

Keep Terminal running. Control-C stops the server. An occupied port is not replaced or killed; stop the earlier preview or add `--port 8865`, then use the printed URL.

## After the fifteen Mac checks: iPhone on trusted private Wi-Fi

Stop with Control-C, then:

```sh
python3 "$HOME/Downloads/start-nasha-preview.py" --lan
```

The launcher discovers the Mac Wi-Fi interface and prints the actual iPhone URL. It binds explicitly to loopback and that private IPv4 address, never all interfaces. Public IPs are rejected. If automatic detection fails, use `--lan-ip 192.168.x.x` with the actual address shown in Mac Wi-Fi settings. Both devices must be on the same trusted Wi-Fi. No public tunnel, port forwarding, authentication bypass or public deployment is created.

## Alternative: already downloaded ZIP

Pass `--archive "$HOME/Downloads/<candidate ZIP filename>.zip"`; the same exact checksum and artifact gates still apply. Without Git, you can also unzip the verified source ZIP and run `python3 scripts/build-pages-artifact.py --out work/mac-preview`, then `python3 scripts/verify-pages-artifact.py work/mac-preview` and serve only `work/mac-preview`. Never serve the repository root.

## Evidence and unchanged website

The launcher is a tooling-only continuation. Its website payload is pinned to the exact candidate above. The website files, approved imagery and runtime artifact digest are unchanged. This does not certify Mac/iPhone Safari: collect actual results using the fifteen-check checklist. Begin with Mac Check 1; complete Mac testing before iPhone.
