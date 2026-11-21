# Superpowers session diagnosis bundle

Session: <session-id>
Harness: <name> <version> (<provenance label>)    Superpowers: <version> (<sha or "not a checkout">; <provenance label>)
Redaction level: skeleton | evidence | full
Built: <ISO timestamp>

Qualify header version fields as historical evidence, unverified snapshot,
current observation, or unknown. `environment.json` carries the same
provenance distinctions for every environment field and its supporting
location.

## What this is

A scrubbed record of a coding-agent session that had superpowers installed
and went wrong. It lets an agent or person who was not present decide
whether superpowers contributed and, if so, what to change. The report
inside states what happened with `path:line` evidence. By design it
contains no diagnosis of superpowers and no proposed fix; that is the
reader's job.

## Files

- `report.md` — the diagnosis report (problem statement, verdict,
  environment, sessions, timeline, findings, involvement, coverage notes).
- `case.md` — the case file the analysts worked from.
- `environment.json` — machine-readable copy of the environment section.
- `timeline.md` — the per-turn timeline.
- `findings/<dimension>.md` — raw analyst findings per dimension.
- `transcripts/<session-id>.md` — condensed per-turn rendering of each
  examined session (never the raw JSONL). Tool-result bodies by level:

  | Level | Tool-result bodies |
  |---|---|
  | skeleton | intentionally limited; replaced by `[tool result: <tool>, <bytes> bytes, exit <code>]` |
  | evidence | kept for cited events, including the commands and results needed to support findings |
  | full | all kept |
- `scrub-log.md` — every placeholder used and its category (never the
  original value).

## How to read it

Start with `report.md` §1–2, then §7 (involvement) and the evidence lines
it cites, then the matching turns in `transcripts/`. `path:line` references
point at the original files on the reporter's machine; the same line
numbers are preserved in the condensed transcripts as `[L<n>]` markers.

## Redaction

Placeholders look like `<EMAIL-1>`, `<PERSON-2>`, `<SECRET-3>`, `<HOST-4>`,
`<REPO-5>`, `<ORG-6>`, `<PROPRIETARY-7>`; home paths are rewritten to `~/…`. The same placeholder
always refers to the same original value within this bundle.

## Producer instructions

完成したバンドルでは、この指示を実際の結果に置き換えます。

スクラブ後、エクスポートする重要な指摘をすべて、このバンドルだけを使って確認します。引用を、含まれているトランスクリプト/ソースのマーカーに解決し、引用されたコマンド/結果または引用文を読み、それが主張を裏付けていることを検証します。パスと行が存在するだけでは不十分です。リダクションレベルや、必要な非開示によって裏付けが失われる場合は、具体的な制約を記録します。

レポート、case、環境、指摘、README、およびローカルの issue 下書きの整合を取ります。スクラブログの件数を、ログ自身を除く最終ファイルに対して更新します。古くなったエクスポートに関する記述を削除します。バンドルの準備と、アーカイブの引き渡しを区別します。過去のアンカーから、含まれている証拠への対応表を保持します。

独立したプライバシー監査を、証拠の有用性とは別に記録します。
- Privacy audit: CLEAN または未解決の見落とし。
- Evidence support: supported または limited。影響を受ける指摘と理由を添える。

確認後に内容が変わった場合は、影響を受ける確認をやり直します。既存のアーカイブ承認に向けて、最終的なログ、ファイル一覧、および 2 つの結果を提示します。レビュー済みのファイルをアーカイブし、引き渡したアーカイブがそれらと一致することを検証します。アーカイブの引き渡しは、承認後にバンドルの内容を変更するのではなく、レビュー済みバンドルの外側に記録します。スクラブは、プライバシーの網羅的な証明ではありません。
