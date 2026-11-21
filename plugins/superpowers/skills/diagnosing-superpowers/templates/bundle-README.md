# Superpowers session diagnosis bundle

Session: <session-id>
Harness: <name> <version> (<provenance label>)    Superpowers: <version> (<sha or "not a checkout">; <provenance label>)
Redaction level: skeleton | evidence | full
Built: <ISO timestamp>

ヘッダーのバージョンフィールドは、historical evidence、unverified snapshot、current observation、unknown のいずれかとして区別して記載します。`environment.json` は、すべての環境フィールドとその裏付けとなる位置について、同じ出所（provenance）の区別を持ちます。

## What this is

superpowers がインストールされた状態でうまくいかなかった、コーディングエージェントのセッションを、スクラブした記録です。その場にいなかったエージェントや人が、superpowers が影響したかどうか、影響したなら何を変えるべきかを判断できるようにします。同梱のレポートは、起きたことを `path:line` の証拠付きで述べています。設計上、superpowers の診断も修正案も含みません。それは読み手の仕事です。

## Files

- `report.md` — 診断レポート（問題の記述、判定、環境、セッション、タイムライン、指摘、関与、カバレッジノート）。
- `case.md` — analyst が作業の元にした case ファイル。
- `environment.json` — 環境セクションの機械可読コピー。
- `timeline.md` — ターンごとのタイムライン。
- `findings/<dimension>.md` — 観点ごとの analyst の生の指摘。
- `transcripts/<session-id>.md` — 調査した各セッションをターンごとに圧縮した表現（生の JSONL は含まない）。レベルごとの tool result の本文:

  | Level | Tool-result bodies |
  |---|---|
  | skeleton | 意図的に制限する。`[tool result: <tool>, <bytes> bytes, exit <code>]` に置き換える |
  | evidence | 引用したイベントについては残す。指摘の裏付けに必要なコマンドと結果を含む |
  | full | すべて残す |
- `scrub-log.md` — 使用したすべてのプレースホルダとそのカテゴリ（元の値は決して含まない）。

## How to read it

`report.md` の §1〜2 から読み始め、次に §7（関与）とそれが引用する証拠行、さらに `transcripts/` の該当するターンを読みます。`path:line` の参照は報告者のマシン上の元のファイルを指します。同じ行番号は、圧縮したトランスクリプトに `[L<n>]` マーカーとして保持されています。

## Redaction

プレースホルダは `<EMAIL-1>`、`<PERSON-2>`、`<SECRET-3>`、`<HOST-4>`、`<REPO-5>`、`<ORG-6>`、`<PROPRIETARY-7>` のような形をしています。ホームパスは `~/…` に書き換えられます。このバンドル内では、同じプレースホルダは常に同じ元の値を指します。

## Producer instructions

完成したバンドルでは、この指示を実際の結果に置き換えます。

スクラブ後、エクスポートする重要な指摘をすべて、このバンドルだけを使って確認します。引用を、含まれているトランスクリプト/ソースのマーカーに解決し、引用されたコマンド/結果または引用文を読み、それが主張を裏付けていることを検証します。パスと行が存在するだけでは不十分です。リダクションレベルや、必要な非開示によって裏付けが失われる場合は、具体的な制約を記録します。

レポート、case、環境、指摘、README、およびローカルの issue 下書きの整合を取ります。スクラブログの件数を、ログ自身を除く最終ファイルに対して更新します。古くなったエクスポートに関する記述を削除します。バンドルの準備と、アーカイブの引き渡しを区別します。過去のアンカーから、含まれている証拠への対応表を保持します。

独立したプライバシー監査を、証拠の有用性とは別に記録します。
- Privacy audit: CLEAN または未解決の見落とし。
- Evidence support: supported または limited。影響を受ける指摘と理由を添える。

確認後に内容が変わった場合は、影響を受ける確認をやり直します。既存のアーカイブ承認に向けて、最終的なログ、ファイル一覧、および 2 つの結果を提示します。レビュー済みのファイルをアーカイブし、引き渡したアーカイブがそれらと一致することを検証します。アーカイブの引き渡しは、承認後にバンドルの内容を変更するのではなく、レビュー済みバンドルの外側に記録します。スクラブは、プライバシーの網羅的な証明ではありません。
