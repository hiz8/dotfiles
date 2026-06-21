// commit スキル共有ロジック: コミットメッセージの表示幅・折り返し・構造判定。
//
// commitlint のローカル日本語プラグイン (commitlint-plugin-ja.mjs) と、
// 補助デバッグツール (check-commit-message.mjs) から参照される。
// 旧 check-commit-message.mjs の判定ロジックを意味を変えずに切り出したもので、
// 表示幅・折り返し・タイトル長の判定結果は旧実装と一致 (パリティ) させる。

export const MAX_WIDTH = 80 // 1行の表示幅の上限
export const MIN_WIDTH = 70 // 折り返し継続行で下回ってはいけない目安幅
export const MAX_TITLE_CHARS = 50 // コミットタイトルの最大文字数 (コードポイント数)

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

// 生メッセージを行構造へ分解する。旧 check-commit-message.mjs と同じ規則:
//   - CRLF を LF へ正規化し、元の物理行番号 (1 始まり) を保持する。
//   - 行頭 `#` の git コメント行は除外する (active)。
//   - subject は active の先頭行。subject の直後に空行があれば body はその次以降。
// 戻り値の hadLeadingBlank は subject 直後の空行の有無 (空行検証は commitlint の
// body-leading-blank が担うため、ここでは body 抽出のためだけに用いる)。
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
