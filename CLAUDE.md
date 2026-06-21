# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal dotfiles for WSL2 / Linux, managed with **GNU Stow**. There is no build
step and no test suite — the "code" is config files plus a thin install wrapper.

## Commands

```sh
./install.sh            # stow every top-level package
./install.sh bash git   # stow only the named packages
stow --target="$HOME" -D bash git vim   # uninstall (remove symlinks)
```

`install.sh` always passes `--target="$HOME"` (the repo need not live in `$HOME`)
and uses `--restow`, so re-running it is idempotent and safe after editing files.

## Architecture: the Stow package convention

Each top-level directory is a Stow **package** whose internal layout mirrors
`$HOME`. Stowing a package symlinks its files into place:

- `bash/.bashrc` → `~/.bashrc`
- `git/.gitconfig` → `~/.gitconfig`
- `claude/.claude/settings.json` → `~/.claude/settings.json`

To add a new dotfile, create a package dir mirroring its `$HOME` location
(e.g. `tmux/.tmux.conf`), then run `./install.sh tmux`. This is the single most
important thing to get right: **file paths inside a package are relative to
`$HOME`, not to the repo root.**

## The `claude` package is selective

Claude Code keeps real runtime state and secrets in `~/.claude/`. This package
deliberately tracks **only editable configuration** — `CLAUDE.md`,
`settings.json`, `commands/`, `hooks/`, and selected `skills/` — and must leave
runtime/secret files (`history.jsonl`, `projects/`, `sessions/`,
`.credentials.json`, …) untouched. When adding files here, never pull in runtime
state or credentials.

Because `~/.claude/` already contains real files, a plain `./install.sh claude`
conflicts. Adopt instead (contents are identical, so the diff stays clean):

```sh
stow --target="$HOME" --adopt claude
git diff   # confirm nothing changed
```

The same `--adopt` trick resolves any "existing real file in `$HOME`" conflict
for other packages too — it moves the existing file into the package and
replaces it with a symlink, so always review `git diff` afterward.

## Conventions

- Machine-local overrides go in `*.local` files (gitignored) — keep them out of
  version control rather than editing tracked files with host-specific values.
- Skills/commands scoped under `claude/.claude/` are authored as agent-facing
  instructions; treat their wording precisely when editing.
