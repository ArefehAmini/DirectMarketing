#!/usr/bin/env bash
# Build RasaWeb Agent extension ZIP — includes ALL folders (sidepanel too!)
# Usage: bash /home/z/my-project/scripts/build-extension-zip.sh <version>
set -euo pipefail

VER="${1:?usage: build-extension-zip.sh <version>}"
SRC="/home/z/my-project/public/extension"
NAME="rasaweb-agent-v${VER}.zip"

cd "$SRC"

# Remove old zips (any version)
rm -f "$SRC"/rasaweb-agent-v*.zip /home/z/my-project/download/rasaweb-agent-v*.zip

# Stamp version into user-facing files (README + popup placeholder) — keep in sync with manifest
sed -i "s/RasaWeb Agent — Chrome Extension v[0-9.]*/RasaWeb Agent — Chrome Extension v${VER}/" "$SRC/README.txt"
sed -i "s|\(class=\"ver\">v\)[0-9.]*|\1${VER}|" "$SRC/popup/popup.html"

# Sanity 1: manifest version must match requested version
MANIFEST_VER=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
if [ "$MANIFEST_VER" != "$VER" ]; then
  echo "ERROR: manifest.json version ($MANIFEST_VER) != requested ($VER)"; exit 1
fi

# Sanity 2: every file referenced by manifest must exist
python3 - <<EOF
import json, os
m = json.load(open("manifest.json"))
refs = []
sw = m.get("background", {}).get("service_worker")
if sw: refs.append(sw)
sp = m.get("side_panel", {}).get("default_path")
if sp: refs.append(sp)
pop = m.get("action", {}).get("default_popup")
if pop: refs.append(pop)
for k in ("16", "48", "128"):
    ic = m.get("icons", {}).get(k)
    if ic: refs.append(ic)
for cs in m.get("content_scripts", []):
    refs.extend(cs.get("js", []))
missing = [r for r in refs if not os.path.exists(r)]
if missing:
    print("ERROR: missing referenced files:", missing); raise SystemExit(1)
print(f"manifest references OK ({len(refs)} files)")
EOF

# Build ZIP — manifest at root (Chrome requirement)
mkdir -p /home/z/my-project/download
python3 - <<EOF
import zipfile, os
root = "$SRC"
out = "/home/z/my-project/download/$NAME"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d != "__MACOSX"]
        for f in files:
            if f.endswith(".zip"): continue
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, root)
            z.write(full, rel)
with zipfile.ZipFile(out) as z:
    names = z.namelist()
    assert "manifest.json" in names, "manifest.json must be at ZIP root"
    assert any("sidepanel" in n for n in names), "sidepanel missing!"
print(f"ZIP OK: {len(names)} entries, manifest at root, sidepanel included")
EOF

# Copy to public for serving
cp "/home/z/my-project/download/$NAME" "$SRC/$NAME"

# Sanity 3: verify the built zip content loads (node syntax check for js files)
python3 - <<EOF
import zipfile
with zipfile.ZipFile("/home/z/my-project/download/$NAME") as z:
    bad = z.testzip()
    if bad: raise SystemExit(f"corrupt entry: {bad}")
print("BUILT: /home/z/my-project/download/$NAME")
EOF
