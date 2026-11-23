#!/bin/sh
#
# Claude Code の statusLine 用スクリプト。
# 標準入力で受け取るセッション情報（JSON）から、次の形式で 1 行出力する:
#
#   [{モデル名}] 📂 {フォルダ名} 🌿 {ブランチ名} | ctx: {n}% 現在: {n}% ({リセット時刻}) 今週: {n}%
#
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

dir=""
branch=""
if [ -n "$cwd" ]; then
	dir=$(basename "$cwd")
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
