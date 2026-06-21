# dotfiles

Personal dotfiles for WSL2 / Linux.

## インストール

もし GNU Stow が未インストールであれば先にインストールする。

```sh
sudo apt install stow
```

GNU Stow がインストール済みであれば `install.sh` で dotfiles パッケージをインストールする。

```sh
cd /path/to/dotfiles
./install.sh            # すべてのパッケージを stow する
./install.sh bash git   # 特定のパッケージを指定することも可能
```

このリポジトリは `$HOME` 直下に置く必要はないため、`install.sh` は常に
`--target="$HOME"` を Stow に渡す。

## パッケージ

| パッケージ | リンク先                             |
| ---------- | ------------------------------------ |
| `bash`     | `~/.bashrc`, `~/.profile`            |
| `git`      | `~/.gitconfig`                       |
| `vim`      | `~/.vimrc`                           |
| `claude`   | `~/.claude/` 配下の Claude Code 設定 |

`claude` パッケージが追跡するのは編集可能な設定 (`CLAUDE.md`、`settings.json`、
`commands/`、`hooks/`、`skills/`) のみであり、ランタイム状態や秘密情報（`history.jsonl`、
`projects/`、`sessions/`、`.credentials.json` など）は管理の対象外とし、
`~/.claude/` 内に残す。

> **既存の `~/.claude` を移行する場合:** Claude Code は既にそこに実ファイルを
> 保持しているため、単純な `./install.sh claude` は競合する。そのため代わりに既存の
> ファイルをパッケージへ取り込む（内容は同一なので diff はクリーンなままとなる）。
>
> ```sh
> stow --target="$HOME" --adopt claude
> git diff   # 何も変わっていないことを確認する
> ```

### `$HOME` にある既存ファイル

Stow は `$HOME` に既に存在する実ファイルを上書きしない。例えば実ファイルの `~/.bashrc`
が既にある場合は、下記のように先にバックアップを取る。

```sh
mv ~/.bashrc ~/.bashrc.bak
```

もしくは Stow に **adopt** させる。これは既存ファイルをパッケージへ移動し、
シンボリックリンクに置き換えるので、実行後に diff を確認する。

```sh
stow --target="$HOME" --adopt bash
git diff   # 取り込んだ内容が期待どおりか確認する
```

## アンインストール

```sh
stow --target="$HOME" -D bash git vim
```

## 新しい dotfile の追加

各トップレベルディレクトリは `$HOME` のレイアウトを反映した Stow の _パッケージ_
であり、stow するとそれらのファイルが所定の場所にシンボリックリンクされる。  
（例: `bash/.bashrc` → `~/.bashrc`）

新しく追加する場合は下記を実行する。

1. `$HOME` 配下の配置場所を反映したパッケージディレクトリを作成する
   例: `tmux/.tmux.conf`。
2. 設定ファイルをそこへ移動する
3. `./install.sh tmux` を実行する
