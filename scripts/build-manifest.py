"""Regenerate release-files.json (path, bytes, sha256) for the reviewed release set. Run after an intentional change; the diff of this file IS the review record."""
from pathlib import Path
import hashlib, json
root = Path(__file__).resolve().parents[1]
FILES = ["index.html", "nasha.html", "ai-engineering.html", "nasha-lab.html", "projects.html", "recruiter.html", "404.html", "robots.txt", "sitemap.xml", "mark.svg", "cinematic.css", "cinematic.js",
         "css/system.css", "js/common.js", "js/hero.js", "js/trace.js", "js/arch.js", "js/pipeline.js", "js/verify.js", "js/dash.js", "js/projects.js", "js/growth.js", "growthos.html", "js/launch.js", "js/incident.js", "js/journey.js", "js/twobiz.js", "launch.html", "data/growth-os-evidence.json", "reliability.html", "security.html", "data/nasha-governed-evidence.json", "data/release-gate-report.json", "ritesh_mamidi_resume.pdf",
         "assets/fonts/inter-latin.woff2", "assets/fonts/jetbrains-mono-latin.woff2", "assets/fonts/Inter-LICENSE.txt", "assets/fonts/JetBrains-Mono-LICENSE.txt", "assets/js/nasha-ecosystem-core.js",
         *sorted(str(x.relative_to(root)) for x in (root / "assets/growth").glob("*.webp")),
         "recovered/nasha-b666563/content/nasha-integration-evidence.json", "recovered/nasha-b666563/docs/nasha-ecosystem/ARCHITECTURE.md"]
out = [{"path": f, "bytes": (root / f).stat().st_size, "sha256": hashlib.sha256((root / f).read_bytes()).hexdigest()} for f in FILES]
(root / "release-files.json").write_text(json.dumps(out, indent=2) + "\n")
print(len(out), "files")
