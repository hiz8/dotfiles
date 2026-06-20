#!/usr/bin/env bash
#
# Symlink dotfile packages into $HOME using GNU Stow.
#
# Usage:
#   ./install.sh             # stow every package
#   ./install.sh bash git    # stow only the named packages
#
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DOTFILES_DIR"

if ! command -v stow >/dev/null 2>&1; then
	echo "Error: GNU Stow is not installed. Install it with: sudo apt install stow" >&2
	exit 1
fi

if [ "$#" -gt 0 ]; then
	packages=("$@")
else
	# Every directory at the repo root is a package.
	packages=()
	for dir in */; do
		packages+=("${dir%/}")
	done
fi

for pkg in "${packages[@]}"; do
	echo "Stowing ${pkg} ..."
	stow --target="$HOME" --restow "$pkg"
done

echo "Done."
