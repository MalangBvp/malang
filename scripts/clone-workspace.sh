#!/usr/bin/env bash
# Clone sibling MalangBvp repos next to this malang checkout.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

clone_if_missing() {
  local name="$1"
  local url="$2"
  if [ -d "$name/.git" ]; then
    echo "already present: $name"
  else
    git clone "$url" "$name"
  fi
}

clone_if_missing malang-tools https://github.com/malangbvp/malang-tools.git
clone_if_missing media https://github.com/malangbvp/media.git
clone_if_missing redirector https://github.com/malangbvp/redirector.git
clone_if_missing .github https://github.com/malangbvp/.github.git

echo
echo "Open the multi-root workspace:"
echo "  cursor $(cd "$(dirname "$0")/.." && pwd)/malang.code-workspace"
