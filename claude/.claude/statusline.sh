#!/bin/sh
#
# Claude Code の statusLine 用スクリプト。
# 標準入力で受け取るセッション情報（JSON）から、次の形式で 1 行出力する:
#
#   [{モデル名}] 📂 {フォルダ名} 🌿 {ブランチ名} ctx: {n}%
#
# 値が取れない項目（git 管理外のブランチなど）は表示しない。

input=$(cat)

field() {
	printf '%s' "$input" | jq -r "$1 // empty"
}

model=$(field '.model.display_name')
cwd=$(field '.workspace.current_dir')
used=$(field '.context_window.used_percentage')

dir=""
branch=""
if [ -n "$cwd" ]; then
	dir=$(basename "$cwd")
	branch=$(git --no-optional-locks -C "$cwd" symbolic-ref --short -q HEAD 2>/dev/null ||
		git --no-optional-locks -C "$cwd" rev-parse --short HEAD 2>/dev/null)
fi

parts=""
add() {
	if [ -n "$parts" ]; then
		parts="$parts $1"
	else
		parts="$1"
	fi
}

# 色: モデル名=シアン、フォルダ名=青（太字）、ブランチ名=黄
[ -n "$model" ] && add "$(printf '\033[36m[%s]\033[00m' "$model")"
[ -n "$dir" ] && add "$(printf '📂 \033[01;34m%s\033[00m' "$dir")"
[ -n "$branch" ] && add "$(printf '🌿 \033[33m%s\033[00m' "$branch")"
[ -n "$used" ] && add "$(printf 'ctx: %.0f%%' "$used")"

printf '%s' "$parts"
