#!/bin/sh
# Rebuild every generated page in order, then refresh the manifest and run the validator. Run from the repo root.
set -e
python3 scripts/build-home.py
python3 scripts/build-lab.py
python3 scripts/build-cases.py
python3 scripts/build-datalab.py
python3 scripts/build-lab.py
python3 scripts/validate-release.py
python3 scripts/check-lab.py
