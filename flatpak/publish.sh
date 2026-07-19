#!/usr/bin/env bash
# Build the Lerd desktop Flatpak and publish it to a self-hosted OSTree repo,
# then (re)generate lerd.flatpakref. Users install with
#   flatpak install --user https://lerd.sh/lerd.flatpakref
# and update with `flatpak update` (or automatically via GNOME Software / KDE
# Discover), pulling new commits from the repo this script exports.
#
# Usage:
#   LERD_FLATPAK_GPG_KEY=you@example.com flatpak/publish.sh
#
# Then upload the two outputs to your host:
#   repo/            -> $REPO_URL   (served as static files)
#   lerd.flatpakref  -> $REF_URL

set -euo pipefail

APP_ID="sh.lerd.Desktop"
BRANCH="${LERD_FLATPAK_BRANCH:-stable}"
REPO_DIR="${LERD_FLATPAK_REPO_DIR:-repo}"
REPO_URL="${LERD_FLATPAK_REPO_URL:-https://lerd.sh/flatpak}"
REF_URL="${LERD_FLATPAK_REF_URL:-https://lerd.sh/lerd.flatpakref}"
GPG_KEY="${LERD_FLATPAK_GPG_KEY:-}"

cd "$(dirname "$0")/.."

builder="flatpak-builder"
command -v flatpak-builder >/dev/null 2>&1 || builder="flatpak run org.flatpak.Builder"

sign=()
if [ -n "$GPG_KEY" ]; then
  sign=(--gpg-sign="$GPG_KEY")
else
  echo "WARNING: no LERD_FLATPAK_GPG_KEY set; the repo and ref will be UNSIGNED." >&2
  echo "         Sign for a public repo: set LERD_FLATPAK_GPG_KEY to a gpg key id." >&2
fi

echo "==> Building and exporting $APP_ID ($BRANCH) to $REPO_DIR/"
# shellcheck disable=SC2086
$builder --force-clean --user --install-deps-from=flathub \
  --default-branch="$BRANCH" "${sign[@]}" \
  --repo="$REPO_DIR" build-dir flatpak/$APP_ID.yml

echo "==> Updating repo metadata + static deltas"
flatpak build-update-repo "${sign[@]}" --generate-static-deltas --prune "$REPO_DIR"

echo "==> Writing lerd.flatpakref"
{
  echo "[Flatpak Ref]"
  echo "Name=$APP_ID"
  echo "Branch=$BRANCH"
  echo "Title=Lerd"
  echo "Url=$REPO_URL"
  echo "Homepage=https://lerd.sh"
  echo "IsRuntime=false"
  echo "RuntimeRepo=https://flathub.org/repo/flathub.flatpakrepo"
  if [ -n "$GPG_KEY" ]; then
    echo "GPGKey=$(gpg --export "$GPG_KEY" | base64 -w0)"
  fi
} > lerd.flatpakref

echo
echo "Done. Upload to your host:"
echo "  $REPO_DIR/            -> $REPO_URL"
echo "  lerd.flatpakref       -> $REF_URL"
