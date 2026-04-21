#!/usr/bin/env bash
# Creates hyper-screen-tool/hyper-screen-tool.github.io (if missing) and pushes this repo's main branch.
# Requires: GitHub CLI (gh) and permission to create repos in the hyper-screen-tool org.
# One-time: run `gh auth login` (or set GH_TOKEN with repo scope for that org).

set -euo pipefail

REPO="hyper-screen-tool/hyper-screen-tool.github.io"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login" >&2
  echo "Or set GH_TOKEN (classic PAT with repo scope, or fine-grained with Contents + Pages on this org)." >&2
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Creating https://github.com/$REPO ..."
  gh repo create "$REPO" --public --description "HYPERSCREEN — paper & model site"
else
  echo "Repo already exists: https://github.com/$REPO"
fi

cd "$ROOT"

if git remote get-url hyper-screen-tool-io >/dev/null 2>&1; then
  git remote set-url hyper-screen-tool-io "https://github.com/$REPO.git"
else
  git remote add hyper-screen-tool-io "https://github.com/$REPO.git"
fi

echo "Pushing main to hyper-screen-tool-io ..."
git push -u hyper-screen-tool-io main

echo
echo "Done. Enable Pages → GitHub Actions on the repo if you have not already."
echo "Site URL (after deploy): https://hyper-screen-tool.github.io/"
