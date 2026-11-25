// commit スキルの検証ロジック: コミットメッセージの表示幅・折り返し・構造判定。
//
// checkMessage が規約 (references/commit-rules.md の [機械] ルール) をすべて判定する。
// CLI (scripts/check-commit-message.mjs) は入力の読み込み・出力・終了コードだけを持ち、
// 判定はこのモジュールに任せる。Node 標準ライブラリ以外に依存しない。

export const MAX_WIDTH = 80 // 1行の表示幅の上限
export const MIN_WIDTH = 70 // 折り返し継続行で下回ってはいけない目安幅
export const TITLE_GUIDE_CHARS = 50 // タイトルの目安の文字数 (超えると注意。コードポイント数)
export const MAX_SUBJECT_CHARS = 72 // subject の 1 行全体の上限 (コードポイント数)

export const COMMIT_TYPES = ["feat", "fix", "docs", "refactor", "test", "chore"]
export const TYPE_PREFIX_RE = new RegExp(`^(${COMMIT_TYPES.join("|")}):\\s`)
export const ISSUE_SUFFIX_RE = /\s+#\d+\s*$/ // タイトル末尾の Issue 番号
export const LIST_MARKER_RE = /^\s*([-*+]|\d+\.)\s/ // リスト項目の開始行
export const SENTENCE_END_RE = /[。．！？]$|[!?]$/ // 文末で自然に終わる行
export const DECORATION_RE = /\*\*|【|】/ // 禁止する装飾記号
export const COAUTHOR_RE = /co-authored-by\s*:/i // 禁止する Co-Authored-By トレーラー

// East Asian Width が Wide / Fullwidth の範囲を全角 (2桁) とみなす。
// 日本語コミットメッセージで現れる漢字・かな・全角約物・全角記号を網羅する。
export function isFullWidth(cp) {
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
export function displayWidth(str) {
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
export function firstMovableUnit(nextText) {
  const t = nextText.replace(/^\s+/, "")
  if (t === "") return { width: 0, needsSpace: false }
  const first = [...t][0]
  if (isFullWidth(first.codePointAt(0))) {
    return { width: 2, needsSpace: false }
  }
  const word = (t.match(/^\S+/) || [first])[0]
  return { width: displayWidth(word), needsSpace: true }
}

// 生メッセージを行構造へ分解する:
//   - CRLF を LF へ正規化し、元の物理行番号 (1 始まり) を保持する。
//   - 行頭 `#` の git コメント行は除外する (active)。
//   - subject は active の先頭行。subject の直後に空行があれば body はその次以降。
// 戻り値の hadLeadingBlank は subject 直後の空行の有無。空行がない場合も、
// 幅の検証のため subject 以降をすべて body として返す。
export function parseStructure(raw) {
  const physical = String(raw ?? "").replace(/\r\n?/g, "\n").split("\n")
  const lines = physical.map((text, i) => ({ n: i + 1, text }))
  const active = lines.filter(({ text }) => !/^#/.test(text))

  const subject = active[0] ?? null
  const afterSubject = active.slice(1)

  let body
  let hadLeadingBlank
  if (afterSubject.length === 0) {
    body = []
    hadLeadingBlank = true
  } else if (afterSubject[0].text.trim() === "") {
    body = afterSubject.slice(1)
    hadLeadingBlank = true
  } else {
    body = afterSubject
    hadLeadingBlank = false
  }

  return { lines, active, subject, body, hadLeadingBlank }
}

// コミットメッセージを規約の [機械] ルールで判定する。
// 戻り値:
//   - empty: subject (コメント行を除いた先頭行) が空なら true。このとき errors は空
//   - errors: { n: 物理行番号, width: 表示幅, msg } の配列 (n の昇順)
//   - warnings: errors と同じ形の注意 (合否に影響しない。タイトルが目安を超えた場合)
//   - lines: CRLF を LF に正規化した全物理行 (コメント行を含む)
//
// options.prefix ({ re, error, example }) を渡すと、種別プレフィックスの代わりに
// その正規表現で subject の接頭辞を判定する (リポジトリ別拡張。re は先頭一致)。
// 一致が空文字列の場合は接頭辞なしとみなす。タイトル長は接頭辞を除いて数える。
export function checkMessage(raw, options = {}) {
  const { lines, active, subject, body, hadLeadingBlank } = parseStructure(raw)
  if (!subject || subject.text.trim() === "") {
    return { empty: true, errors: [], warnings: [], lines }
  }

  const errors = []
  const warnings = []
  const entry = (line, msg) => ({ n: line.n, width: displayWidth(line.text), msg })
  const add = (line, msg) => errors.push(entry(line, msg))

  // --- subject ---
  const { prefix } = options
  let rest
  if (prefix) {
    const m = prefix.re.exec(subject.text)
    if (!m || m[0] === "") {
      add(subject, `${prefix.error} (例: ${prefix.example})`)
      rest = subject.text
    } else {
      rest = subject.text.slice(m[0].length)
    }
  } else {
    if (!TYPE_PREFIX_RE.test(subject.text)) {
      add(
        subject,
        `コミット種別プレフィックスがありません (${COMMIT_TYPES.join("/")} のいずれか + ": ")`,
      )
    }
    rest = subject.text.replace(TYPE_PREFIX_RE, "")
  }
  const title = rest.replace(ISSUE_SUFFIX_RE, "")
  const titleChars = [...title].length
  if (title.trim() === "") {
    add(subject, "タイトルが空です")
  } else if (titleChars > TITLE_GUIDE_CHARS) {
    warnings.push(
      entry(
        subject,
        `タイトルが目安の ${TITLE_GUIDE_CHARS} 文字を超えています (${titleChars} 文字)。` +
          "意味を損なわずに短くできるなら短くしてください",
      ),
    )
  }
  const subjectChars = [...subject.text].length
  if (subjectChars > MAX_SUBJECT_CHARS) {
    add(subject, `subject が ${MAX_SUBJECT_CHARS} 文字を超えています (${subjectChars} 文字)`)
  }
  if (DECORATION_RE.test(subject.text)) {
    add(subject, "禁止された装飾 (**, 【, 】) を含みます")
  }
  if (!hadLeadingBlank) {
    add(subject, "subject の直後には空行が必要です (subject と本文の間)")
  }

  // --- body ---
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

    // 早すぎる改行: 次行が「折り返しの継続行」なのに 70 桁未満
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

  errors.sort((a, b) => a.n - b.n)
  return { empty: false, errors, warnings, lines }
}
