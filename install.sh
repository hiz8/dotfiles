#!/usr/bin/env bash
#
# Symlink dotfile packages into $HOME using GNU Stow.
#
# Usage:
#   ./install.sh             # stow every package (except plugins, docs)
#   ./install.sh bash git    # stow only the named packages
#
set -euo pipefail

# Top-level directories that are not Stow packages.
NON_PACKAGES=(plugins docs)

is_non_package() {
	local name
	for name in "${NON_PACKAGES[@]}"; do
		[ "$1" = "$name" ] && return 0
	done
	return 1
}

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DOTFILES_DIR"

if ! command -v stow >/dev/null 2>&1; then
	echo "Error: GNU Stow is not installed. Install it with: sudo apt install stow" >&2
	exit 1
fi

if [ "$#" -gt 0 ]; then
	packages=("$@")
	for pkg in "${packages[@]}"; do
		pkg="${pkg%/}"
		if is_non_package "$pkg"; then
			echo "Error: '${pkg}' is not a Stow package." >&2
			exit 1
		fi
	done
else
	# Every directory at the repo root is a package, except NON_PACKAGES.
	packages=()
	for dir in */; do
		is_non_package "${dir%/}" || packages+=("${dir%/}")
	done
fi

for pkg in "${packages[@]}"; do
	echo "Stowing ${pkg} ..."
	stow --target="$HOME" --restow "$pkg"
done

echo "Done."
