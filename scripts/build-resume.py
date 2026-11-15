"""Build the public, searchable two-page resume from reviewed content; standard library only.

Run python3 scripts/build-resume.py after reviewing scripts/resume-content.json.
Use --check to verify the checked-in PDF without changing it. Design assets and
publication manifests are never modified by this script.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _wrap(text, width):
    lines, current = [], ""
    for word in text.split():
        if current and len(current) + 1 + len(word) > width:
            lines.append(current)
            current = word
        else:
            current += (" " if current else "") + word
    if current:
        lines.append(current)
    return lines


def _escape(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _number(value):
    return format(value, ".15g")


def render(data):
    assert len(data["pages"]) == 2, "the public resume must have two pages"
    streams = []
    for index, page in enumerate(data["pages"]):
        y, commands = 755, []
        for style, text in page:
            assert all(32 <= ord(char) <= 126 for char in text), "resume text must be searchable ASCII"
            size, width, leading, before, bold = data["styles"][style]
            y -= before
            for line_index, line in enumerate(_wrap(text, width)):
                prefix = ("- " if line_index == 0 else "  ") if style == "bullet" else ""
                commands.append(
                    "BT /" + ("F2" if bold else "F1") + " " + _number(size)
                    + " Tf 1 0 0 1 48 " + _number(y) + " Tm ("
                    + _escape(prefix + line) + ") Tj ET"
                )
                y -= leading
        assert y >= 32, f"resume content overflows page {index + 1}"
        commands.append(
            f"BT /F1 8 Tf 1 0 0 1 48 24 Tm (Ritesh Mamidi | {index + 1} / 2) Tj ET"
        )
        streams.append("\n".join(commands) + "\n")
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    for index, stream in enumerate(streams):
        objects.append(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents "
            + str(6 + index * 2) + " 0 R >>"
        )
        objects.append("<< /Length " + str(len(stream)) + " >>\nstream\n" + stream + "endstream")
    pdf, offsets = "%PDF-1.4\n", [0]
    for index, obj in enumerate(objects):
        offsets.append(len(pdf))
        pdf += f"{index + 1} 0 obj\n{obj}\nendobj\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    pdf += "".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:])
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return pdf.encode("ascii")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = json.loads((ROOT / "scripts/resume-content.json").read_text())
    pdf = render(content)
    target = ROOT / "ritesh_mamidi_resume.pdf"
    if args.check:
        assert target.read_bytes() == pdf, "public resume differs from reviewed content"
        print("PASS: public resume matches its reviewed source; two searchable pages")
    else:
        target.write_bytes(pdf)
        print(f"Wrote {target.name}: {len(pdf)} bytes")


if __name__ == "__main__":
    main()
