#!/usr/bin/env node
// commit スキル補助ツール: コミットメッセージの表示幅ルールを機械的に検証する。
//
// 主たる機械チェックは verify-commit-message.sh (commitlint + ローカル日本語プラグイン)
// へ移行済み。このスクリプトは下記の用途で残している:
//   - `--verbose` による全行の表示幅一覧 (桁数調整のデバッグ補助)
//   - test/parity.mjs のパリティ基準 (commitlint 構成と独立した第2実装)
// 検証ロジックは新構成 (lib/commit-message.mjs) と同一仕様を保つ。
//
// 検証内容:
//   - subject (1行目): コミット種別プレフィックスの有無 / タイトル50文字以内
//   - body 各行: 表示幅80桁以内 (全角2/半角1) / 70桁未満の早すぎる改行 / 装飾禁止
//
// 使い方:
//   node .claude/skills/commit/check-commit-message.mjs <message-file>
//   echo "$msg" | node .claude/skills/commit/check-commit-message.mjs
//   ... --verbose  で全行の表示幅一覧を出力する
//
// エラーが1件でもあれば exit 1。これ以外 (警告なし) は exit 0。
// 機械判定できないルール (Why→What の順序、です・ます調禁止、テスト結果の記載禁止
// など) は references/commit-rules.md を参照し、人/エージェントが自己チェックする。

import { readFileSync } from "node:fs"

const MAX_WIDTH = 80 // 1行の表示幅の上限
const MIN_WIDTH = 70 // 折り返し継続行で下回ってはいけない目安幅
const MAX_TITLE_CHARS = 50 // コミットタイトルの最大文字数 (コードポイント数)

const COMMIT_TYPES = ["feat", "fix", "docs", "refactor", "test", "chore"]
const TYPE_PREFIX_RE = new RegExp(`^(${COMMIT_TYPES.join("|")}):\\s`)
const ISSUE_SUFFIX_RE = /\s+#\d+\s*$/ // タイトル末尾の Issue 番号
const LIST_MARKER_RE = /^\s*([-*+]|\d+\.)\s/ // リスト項目の開始行
const SENTENCE_END_RE = /[。．！？]$|[!?]$/ // 文末で自然に終わる行
const DECORATION_RE = /\*\*|【|】/ // 禁止する装飾記号
const COAUTHOR_RE = /co-authored-by\s*:/i // 禁止する Co-Authored-By トレーラー

// East Asian Width が Wide / Fullwidth の範囲を全角 (2桁) とみなす。
// 日本語コミットメッセージで現れる漢字・かな・全角約物・全角記号を網羅する。
function isFullWidth(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    cp === 0x2329 ||
    cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK 部首補助 .. CJK 記号 (、。「」等)
    (cp >= 0x3041 && cp <= 0x33ff) || // ひらがな・カタカナ・CJK 記号/互換
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK 統合漢字拡張A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 統合漢字
    (cp >= 0xa000 && cp <= 0xa4cf) || // 彝(Yi)
    (cp >= 0xac00 && cp <= 0xd7a3) || // ハングル音節
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK 互換漢字
    (cp >= 0xfe10 && cp <= 0xfe19) || // 縦書き用記号
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK 互換形・小字形
    (cp >= 0xff00 && cp <= 0xff60) || // 全角英数・全角記号
    (cp >= 0xffe0 && cp <= 0xffe6) || // 全角通貨記号等
    (cp >= 0x1f300 && cp <= 0x1faff) || // 絵文字 (全角扱い)
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK 統合漢字拡張B以降
  )
}

// 文字列の表示幅を全角2桁/半角1桁で合算する。
function displayWidth(str) {
  let width = 0
  for (const ch of str) {
    const cp = ch.codePointAt(0)
    if (cp === 0) continue
    width += isFullWidth(cp) ? 2 : 1
  }
  return width
}

// 次行の先頭にある「これ以上分割せず前行へ移動できる最小ユニット」を求める。
// 全角文字なら1文字、ASCII なら次の空白までの単語 (URL・識別子等は分割不可)。
function firstMovableUnit(nextText) {
  const t = nextText.replace(/^\s+/, "")
  if (t === "") return { width: 0, needsSpace: false }
  const first = [...t][0]
  if (isFullWidth(first.codePointAt(0))) {
    return { width: 2, needsSpace: false }
  }
  const word = (t.match(/^\S+/) || [first])[0]
  return { width: displayWidth(word), needsSpace: true }
}

function readInput() {
  const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"))
  try {
    return readFileSync(fileArg ?? 0, "utf8")
  } catch (err) {
    const src = fileArg ? `ファイル ${fileArg}` : "標準入力"
    console.error(`${src} を読み込めませんでした: ${err.message}`)
    process.exit(2)
  }
}

function main() {
  const verbose = process.argv.includes("--verbose")
  const raw = readInput()

  // git のコメント行 (# 始まり) を除外しつつ、元の行番号は保持する。
  const physical = raw.replace(/\r\n?/g, "\n").split("\n")
  const lines = physical.map((text, i) => ({ n: i + 1, text }))
  const active = lines.filter(({ text }) => !/^#/.test(text))

  const errors = []
  const add = (line, msg) =>
    errors.push({ n: line.n, width: displayWidth(line.text), msg })

  // --- subject (1行目) ---
  const subject = active[0]
  if (!subject || subject.text.trim() === "") {
    console.error("コミットメッセージが空です。")
    process.exit(1)
  }
  if (!TYPE_PREFIX_RE.test(subject.text)) {
    add(
      subject,
      `コミット種別プレフィックスがありません (${COMMIT_TYPES.join("/")} のいずれか + ": ")`,
    )
  }
  const title = subject.text
    .replace(TYPE_PREFIX_RE, "")
    .replace(ISSUE_SUFFIX_RE, "")
  const titleChars = [...title].length
  if (titleChars > MAX_TITLE_CHARS) {
    add(subject, `タイトルが ${MAX_TITLE_CHARS} 文字を超えています (${titleChars} 文字)`)
  }
  if (DECORATION_RE.test(subject.text)) {
    add(subject, "禁止された装飾 (**, 【, 】) を含みます")
  }

  // --- body ---
  // subject の直後には空行が1行必要。その次以降を body として検証する。
  const afterSubject = active.slice(active.indexOf(subject) + 1)
  let body
  if (afterSubject.length === 0) {
    body = [] // subject のみのコミット
  } else if (afterSubject[0].text.trim() === "") {
    body = afterSubject.slice(1)
  } else {
    add(subject, "subject の直後には空行が必要です (subject と本文の間)")
    body = afterSubject // 空行が無くても本文として幅検証は行う
  }
  for (let i = 0; i < body.length; i++) {
    const line = body[i]
    if (line.text.trim() === "") continue

    const width = displayWidth(line.text)

    if (DECORATION_RE.test(line.text)) {
      add(line, "禁止された装飾 (**, 【, 】) を含みます")
    }

    if (width > MAX_WIDTH) {
      add(line, `表示幅が ${MAX_WIDTH} 桁を超えています`)
      continue // 超過行はまず幅を削るのが先なので早すぎる改行判定はしない
    }

    // 早すぎる改行: 次行が「折り返しの継続行」なのに70桁未満
    const next = body[i + 1]
    const isContinuation =
      next && next.text.trim() !== "" && !LIST_MARKER_RE.test(next.text)
    if (isContinuation && width < MIN_WIDTH && !SENTENCE_END_RE.test(line.text.trimEnd())) {
      const unit = firstMovableUnit(next.text)
      const projected = width + (unit.needsSpace ? 1 : 0) + unit.width
      if (projected <= MAX_WIDTH) {
        add(
          line,
          `早すぎる改行です。${MIN_WIDTH}〜${MAX_WIDTH} 桁を目安に次行の語を繰り上げて詰めてください`,
        )
      }
    }
  }

  // Co-Authored-By トレーラーはモデルが自動付与することがあるため全行で禁止する。
  for (const line of active) {
    if (COAUTHOR_RE.test(line.text)) {
      add(line, "Co-Authored-By トレーラーは禁止です。この行を削除してください")
    }
  }

  finish(errors, lines, verbose)
}

function finish(errors, lines, verbose) {
  if (verbose) {
    console.error("--- 表示幅一覧 ---")
    for (const { n, text } of lines) {
      console.error(`${String(n).padStart(3)}: ${String(displayWidth(text)).padStart(3)}桁  ${text}`)
    }
    console.error("")
  }

  if (errors.length === 0) {
    console.log("OK: コミットメッセージは表示幅ルールに適合しています。")
    process.exit(0)
  }

  console.error(`コミットメッセージの規約違反が ${errors.length} 件あります:`)
  for (const e of errors.sort((a, b) => a.n - b.n)) {
    console.error(`  行${e.n} (幅=${e.width}): ${e.msg}`)
  }
  process.exit(1)
}

main()
