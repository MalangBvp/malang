#!/usr/bin/env bash
# Clone all five MalangBvp repos into Documents/project-adi and drop a Cursor workspace there.
set -euo pipefail

if [ -n "${PROJECT_ADI:-}" ]; then
  DEST="$PROJECT_ADI"
elif [ -d "${HOME}/Documents" ]; then
  DEST="${HOME}/Documents/project-adi"
elif [ -d "${HOME}/OneDrive/Documents" ]; then
  DEST="${HOME}/OneDrive/Documents/project-adi"
else
  DEST="${HOME}/Documents/project-adi"
fi

mkdir -p "$DEST"
cd "$DEST"

clone_if_missing() {
  local name="$1"
  local url="$2"
  if [ -d "$name/.git" ]; then
    echo "already present: $name"
  else
    git clone "$url" "$name"
  fi
}

clone_if_missing malang https://github.com/malangbvp/malang.git
clone_if_missing malang-tools https://github.com/malangbvp/malang-tools.git
clone_if_missing media https://github.com/malangbvp/media.git
clone_if_missing redirector https://github.com/malangbvp/redirector.git
clone_if_missing .github https://github.com/malangbvp/.github.git

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_WORKSPACE=""
if [ -f "$SCRIPT_DIR/../docs/project-adi.code-workspace" ]; then
  SRC_WORKSPACE="$SCRIPT_DIR/../docs/project-adi.code-workspace"
elif [ -f "$DEST/malang/docs/project-adi.code-workspace" ]; then
  SRC_WORKSPACE="$DEST/malang/docs/project-adi.code-workspace"
fi

if [ -n "$SRC_WORKSPACE" ]; then
  cp "$SRC_WORKSPACE" "$DEST/project-adi.code-workspace"
else
  cat > "$DEST/project-adi.code-workspace" <<'EOF'
{
  "folders": [
    { "name": "malang", "path": "malang" },
    { "name": "malang-tools", "path": "malang-tools" },
    { "name": "media", "path": "media" },
    { "name": "redirector", "path": "redirector" },
    { "name": ".github", "path": ".github" }
  ],
  "settings": {
    "files.exclude": { "**/.git": true }
  }
}
EOF
fi

echo
echo "Workspace ready:"
echo "  $DEST"
echo
echo "Open in Cursor:"
echo "  cursor \"$DEST/project-adi.code-workspace\""
echo "  code \"$DEST/project-adi.code-workspace\""
