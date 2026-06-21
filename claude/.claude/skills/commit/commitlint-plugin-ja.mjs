// commit スキル専用 commitlint ローカルプラグイン。
//
// 標準ツールにない日本語特有の独自ルールを実装する。基本的な構造ルール
// (種別プレフィックス・許可種別・subject 非空・subject 直後の空行) は
// commitlint.config.mjs 側で config-conventional の標準ルールに委ねている。
//
// 各ルールは commitlint の規約に従い (parsed) => [boolean, message] を返す。
// parsed.raw (生メッセージ全文) から行構造を再構成し、行単位ロジックを適用する。
// 違反メッセージは日本語で返す。

import {
  COAUTHOR_RE,
  DECORATION_RE,
  ISSUE_SUFFIX_RE,
  LIST_MARKER_RE,
  MAX_TITLE_CHARS,
  MAX_WIDTH,
  MIN_WIDTH,
  SENTENCE_END_RE,
  TYPE_PREFIX_RE,
  displayWidth,
  firstMovableUnit,
  parseStructure,
} from "./lib/commit-message.mjs"

// タイトル長 50 コードポイント以内。
// `<種別>: ` プレフィックスと末尾 Issue 番号 (` #123`) を除いて数える。
// commitlint の subject-max-length とは計数対象がずれるため、独自実装で再現する。
function titleMaxLength({ raw }) {
  const { subject } = parseStructure(raw)
  if (!subject || subject.text.trim() === "") return [true]
  const title = subject.text
    .replace(TYPE_PREFIX_RE, "")
    .replace(ISSUE_SUFFIX_RE, "")
  const titleChars = [...title].length
  if (titleChars > MAX_TITLE_CHARS) {
    return [
      false,
      `タイトルが ${MAX_TITLE_CHARS} 文字を超えています (行${subject.n}: ${titleChars} 文字)`,
    ]
  }
  return [true]
}

// 本文各行の表示幅 80 桁以内 (全角=2 / 半角=1 の East Asian Width 判定)。
// commitlint の body-max-line-length は「文字数」で数え「表示桁数」では数えないため
// 代用できない。subject の装飾は no-decoration が見るため、ここでは body のみ対象。
function bodyDisplayWidth({ raw }) {
  const { body } = parseStructure(raw)
  const offenders = []
  for (const line of body) {
    if (line.text.trim() === "") continue
    const width = displayWidth(line.text)
    if (width > MAX_WIDTH) offenders.push(`行${line.n} (幅=${width})`)
  }
  if (offenders.length) {
    return [false, `表示幅が ${MAX_WIDTH} 桁を超えています: ${offenders.join(", ")}`]
  }
  return [true]
}

// 早すぎる改行の検出。次行が折り返しの継続行なのに、当該行が 70 桁未満で、かつ
// 次行先頭の語を繰り上げても 80 桁を超えないなら詰め直しを促す。
// 表示幅超過行はまず幅を削るのが先なので、ここでは判定しない (width ルールに委ねる)。
function earlyWrap({ raw }) {
  const { body } = parseStructure(raw)
  const offenders = []
  for (let i = 0; i < body.length; i++) {
    const line = body[i]
    if (line.text.trim() === "") continue
    const width = displayWidth(line.text)
    if (width > MAX_WIDTH) continue

    const next = body[i + 1]
    const isContinuation =
      next && next.text.trim() !== "" && !LIST_MARKER_RE.test(next.text)
    if (
      isContinuation &&
      width < MIN_WIDTH &&
      !SENTENCE_END_RE.test(line.text.trimEnd())
    ) {
      const unit = firstMovableUnit(next.text)
      const projected = width + (unit.needsSpace ? 1 : 0) + unit.width
      if (projected <= MAX_WIDTH) offenders.push(`行${line.n}`)
    }
  }
  if (offenders.length) {
    return [
      false,
      `早すぎる改行です。${MIN_WIDTH}〜${MAX_WIDTH} 桁を目安に次行の語を繰り上げて詰めてください: ${offenders.join(", ")}`,
    ]
  }
  return [true]
}

// 装飾記号 (`**` `【` `】`) の禁止。subject と body の両方を対象とする。
function noDecoration({ raw }) {
  const { subject, body } = parseStructure(raw)
  const offenders = []
  if (subject && DECORATION_RE.test(subject.text)) offenders.push(subject.n)
  for (const line of body) {
    if (line.text.trim() === "") continue
    if (DECORATION_RE.test(line.text)) offenders.push(line.n)
  }
  if (offenders.length) {
    return [false, `禁止された装飾 (**, 【, 】) を含みます (行${offenders.join(", ")})`]
  }
  return [true]
}

// Co-Authored-By トレーラーの全行禁止。一部モデルが末尾へ自動付与するため、
// active な全行 (git コメント行を除く) を走査する。
function noCoauthor({ raw }) {
  const { active } = parseStructure(raw)
  const offenders = active.filter((l) => COAUTHOR_RE.test(l.text)).map((l) => l.n)
  if (offenders.length) {
    return [
      false,
      `Co-Authored-By トレーラーは禁止です。該当行を削除してください (行${offenders.join(", ")})`,
    ]
  }
  return [true]
}

export default {
  rules: {
    "ja-title-max-length": titleMaxLength,
    "ja-body-display-width": bodyDisplayWidth,
    "ja-early-wrap": earlyWrap,
    "ja-no-decoration": noDecoration,
    "ja-no-coauthor": noCoauthor,
  },
}
