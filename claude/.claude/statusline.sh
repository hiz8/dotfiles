#!/bin/sh
#
# Claude Code の statusLine 用スクリプト。
# 標準入力で受け取るセッション情報（JSON）から、次の形式で 1 行出力する:
#
#   [{モデル名}] 📂 {リポジトリ名}[@{worktree 名}][/{パス}] 🌿 {ブランチ名} | ctx: {n}% 現在: {n}% ({リセット時刻}) 今週: {n}%
#
# - 📂 は git 管理下ならリポジトリ名からのパス、管理外なら今いるフォルダ名（folder_label 参照）。
# - 「現在」は 5 時間枠、「今週」は週次枠の利用制限の使用率。
#   rate_limits は claude.ai の Pro / Max / Ultra でのみ、最初の応答後に渡される。
# - ctx / 現在 / 今週 は使用率で色分けする（50% 未満: 通常、50〜79%: 黄、80% 以上: 赤）。
# - 値が取れない項目は表示しない。利用量の項目が 1 つもなければ「|」も出さない。

input=$(cat)

# 必要な値を jq 1 回でまとめて取り出し、シェル変数として読み込む。
# ステータスラインは頻繁に更新されるので、jq の起動回数を抑える。
# 文字列と数値だけを通し、値がない・null・真偽値・配列などのときは空文字にする。
# 途中の階層の型が違っても f? でその項目だけを空にする。JSON が壊れていれば全項目が空になる。
model="" cwd="" ctx="" five="" five_reset="" week=""
eval "$(printf '%s' "$input" | jq -r '
	def v(f): ([f? | strings, numbers | tostring] | first) // "";
	@sh "model=\(v(.model.display_name))",
	@sh "cwd=\(v(.workspace.current_dir))",
	@sh "ctx=\(v(.context_window.used_percentage))",
	@sh "five=\(v(.rate_limits.five_hour.used_percentage))",
	@sh "five_reset=\(v(.rate_limits.five_hour.resets_at))",
	@sh "week=\(v(.rate_limits.seven_day.used_percentage))"
' 2>/dev/null)"

# 使用率（小数可）を整数に丸め、閾値に応じた色で "{n}%" を出力する。
# 丸めは printf '%.0f' による偶数丸め（例: 80.5 → 80）。色は丸めた後の値で決まる。
colored_pct() {
	n=$(printf '%.0f' "$1")
	if [ "$n" -ge 80 ]; then
		printf '\033[31m%s%%\033[00m' "$n"
	elif [ "$n" -ge 50 ]; then
		printf '\033[33m%s%%\033[00m' "$n"
	else
		printf '%s%%' "$n"
	fi
}

# Unix 秒をローカル時刻の HH:MM にする（GNU date と BSD date の両対応）。
clock() {
	date -d "@$1" +%H:%M 2>/dev/null || date -r "$1" +%H:%M 2>/dev/null
}

# ルートからの相対パスが 3 階層以上なら、末尾の 2 階層だけを残して「…/」で省略する。
#   claude/.claude          → claude/.claude
#   claude/.claude/skills   → …/.claude/skills
shorten_path() {
	case "$1" in
	*/*/*)
		last=${1##*/}
		rest=${1%/*}
		printf '…/%s/%s' "${rest##*/}" "$last"
		;;
	*) printf '%s' "$1" ;;
	esac
}

# 📂 に表示するフォルダ名を出力する。
#   リポジトリのルート:             dotfiles
#   サブフォルダ:                   dotfiles/src
#   linked worktree のルート:       dotfiles@wt-feature
#   linked worktree のサブフォルダ: dotfiles@wt-feature/src
# git 管理外や .git の中などでは、今いるフォルダ名だけを出力する。
# リポジトリ名は本体の .git があるフォルダ名から取る。.git の置き場所が特殊なときは、
# その置き場所のフォルダ名を使う（サブモジュール: .git/modules/<名前>、bare: <名前>.git）。
# --path-format は git 2.31 以降が必要で、それより古ければフォルダ名だけになる。
folder_label() {
	parsed=$(git --no-optional-locks -C "$1" rev-parse --path-format=absolute \
		--show-toplevel --git-dir --git-common-dir --show-prefix 2>/dev/null) || {
		basename "$1"
		return
	}
	# rev-parse は 1 行に 1 つずつ値を出す。--show-prefix はルートでは空行になる。
	{
		read -r top
		read -r git_dir
		read -r common_dir
		read -r prefix
	} <<EOF
$parsed
EOF
	prefix=${prefix%/}

	case "$common_dir" in
	*/.git) repo=$(basename "$(dirname "$common_dir")") ;;
	*) repo=$(basename "$common_dir" .git) ;;
	esac

	label=$repo
	# git-dir と git-common-dir が違えば linked worktree の中にいる
	if [ "$git_dir" != "$common_dir" ]; then
		label="$label@$(basename "$top")"
	fi
	[ -n "$prefix" ] && label="$label/$(shorten_path "$prefix")"
	printf '%s' "$label"
}

dir=""
branch=""
if [ -n "$cwd" ]; then
	dir=$(folder_label "$cwd")
	branch=$(git --no-optional-locks -C "$cwd" symbolic-ref --short -q HEAD 2>/dev/null ||
		git --no-optional-locks -C "$cwd" rev-parse --short HEAD 2>/dev/null)
fi

# 作業の情報（色: モデル名=シアン、フォルダ名=青（太字）、ブランチ名=黄）
info=""
[ -n "$model" ] && info="${info:+$info }$(printf '\033[36m[%s]\033[00m' "$model")"
[ -n "$dir" ] && info="${info:+$info }$(printf '📂 \033[01;34m%s\033[00m' "$dir")"
[ -n "$branch" ] && info="${info:+$info }$(printf '🌿 \033[33m%s\033[00m' "$branch")"

# 利用量
usage=""
[ -n "$ctx" ] && usage="${usage:+$usage }ctx: $(colored_pct "$ctx")"
if [ -n "$five" ]; then
	item="現在: $(colored_pct "$five")"
	if [ -n "$five_reset" ]; then
		t=$(clock "$five_reset")
		[ -n "$t" ] && item="$item ($t)"
	fi
	usage="${usage:+$usage }$item"
fi
[ -n "$week" ] && usage="${usage:+$usage }今週: $(colored_pct "$week")"

# 片方が空なら区切りを出さずに連結する
if [ -n "$info" ] && [ -n "$usage" ]; then
	printf '%s | %s' "$info" "$usage"
else
	printf '%s' "$info$usage"
fi
