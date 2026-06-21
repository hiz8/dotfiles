#!/usr/bin/env bash
# commit スキル専用: コミットメッセージを commitlint (+ローカル日本語プラグイン) で検証する。
#
# 使い方:
#   verify-commit-message.sh <message-file>
#   echo "$msg" | verify-commit-message.sh
#
# 違反が 1 件でもあれば commitlint が exit 非ゼロを返す。
# ローカル日本語ルールのメッセージは日本語、config-conventional 由来の標準ルール
# (種別・空 subject 等) のメッセージは英語で出力される。
set -euo pipefail

# symlink (stow) 経由で呼ばれても realpath で repo 側の実体ディレクトリを解く。
# node_modules / 設定はここに置かれ、Node の realpath モジュール解決と一致させる。
here="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"

# 依存が未インストールなら一度だけ取得する (dotfiles 本体は非 Node のため遅延導入)。
if [ ! -x "$here/node_modules/.bin/commitlint" ]; then
  echo "commitlint をインストールしています (初回のみ)..." >&2
  npm install --prefix "$here" >&2
fi

# 入力を一時ファイルへ集約し、--edit で渡す (# コメント行の扱いを揃えるため)。
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
if [ "$#" -ge 1 ] && [ "$1" != "-" ]; then
  cat -- "$1" >"$tmp"
else
  cat >"$tmp"
fi

status=0
"$here/node_modules/.bin/commitlint" \
  --config "$here/commitlint.config.mjs" \
  --edit "$tmp" || status=$?
exit "$status"
