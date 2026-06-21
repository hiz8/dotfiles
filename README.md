# dotfiles

Personal dotfiles for WSL2 / Linux.

## Requirements

GNU Stow:

```sh
sudo apt install stow
```

## Install

```sh
cd /path/to/dotfiles
./install.sh            # stow every package
./install.sh bash git   # or only the packages you name
```

This repo does not have to live directly in `$HOME`, so `install.sh` always
passes `--target="$HOME"` to Stow.

## Packages

| Package  | Links into                                  |
| -------- | ------------------------------------------- |
| `bash`   | `~/.bashrc`, `~/.profile`                   |
| `git`    | `~/.gitconfig`                              |
| `vim`    | `~/.vimrc`                                  |
| `claude` | Claude Code config under `~/.claude/`       |

The `claude` package only tracks editable configuration — `CLAUDE.md`,
`settings.json`, `commands/`, `hooks/`, and selected `skills/` — and leaves
runtime state and secrets (`history.jsonl`, `projects/`, `sessions/`,
`.credentials.json`, …) untouched in `~/.claude/`.

> **Migrating an existing `~/.claude`:** because Claude Code already keeps real
> files there, a plain `./install.sh claude` will conflict. Adopt the existing
> files into the package instead (contents are identical, so the diff stays
> clean):
>
> ```sh
> stow --target="$HOME" --adopt claude
> git diff   # confirm nothing changed
> ```

### Existing files in `$HOME`

Stow refuses to overwrite a _real_ file that already exists in `$HOME`. If you
already have e.g. a real `~/.bashrc`, either back it up first:

```sh
mv ~/.bashrc ~/.bashrc.bak
```

…or let Stow **adopt** it — this moves the existing file into the package and
replaces it with a symlink, so review the diff afterwards:

```sh
stow --target="$HOME" --adopt bash
git diff   # confirm the adopted content matches what you expect
```

## Uninstall

```sh
stow --target="$HOME" -D bash git vim
```

## Add a new dotfile

Each top-level directory is a Stow _package_ whose contents mirror the layout of
`$HOME`; stowing it symlinks those files into place (e.g. `bash/.bashrc` →
`~/.bashrc`). To add a new one:

1. Create the package directory mirroring its location under `$HOME`,
   e.g. `tmux/.tmux.conf`.
2. Move your config into it.
3. Run `./install.sh tmux`.
