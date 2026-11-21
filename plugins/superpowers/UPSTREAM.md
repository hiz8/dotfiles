# UPSTREAM: 翻訳元・翻訳方針・用語集・翻訳手順

このプラグインは [obra/superpowers](https://github.com/obra/superpowers) の
スキル群を、内容を変えずに日本語へ翻訳したものである。カスタマイズは翻訳完了後の
別作業で行う。翻訳作業者はこのファイルに従う。

## 翻訳元

- リポジトリ: https://github.com/obra/superpowers （MIT ライセンス。`LICENSE` を同梱）
- タグ: `v7.0.2`
- コミット: `22f0b463e7a5e579904dd6211a520321035526f7`
- 参照コピーの取得（プラグインキャッシュは元プラグインの無効化後に消える可能性があるため使わない）:

```sh
UPSTREAM="${TMPDIR:-/tmp}/superpowers-v7.0.2"
git clone --depth 1 --branch v7.0.2 https://github.com/obra/superpowers "$UPSTREAM"
git -C "$UPSTREAM" rev-parse HEAD   # 22f0b463e7a5e579904dd6211a520321035526f7 であること
```

## 翻訳方針

- 内容を変えない。意味の追加・削除・言い換えによる改変をしない。訳しにくい箇所も
  省略や要約で済ませず、原文の条件・否定・列挙・例をすべて残す
- MUST / NEVER / IMPORTANT 等の規範語は日本語でも同等の強さで表現する（下の「規範語」表）
- 文体は敬体（です・ます調）で簡潔に（2026-11-21 ユーザー決定で常体から変更）。説明は「〜します」「〜です」、
  指示は「〜してください」、義務・禁止は「〜しなければなりません」「〜してはいけません」で書く。
  敬体にしても指示を弱めない（依頼調の「〜していただけますか」「〜してもよいでしょう」などにしない）
- 見出しと、文になっていない箇条書き（名詞句）は体言止めでよい。文で終わる箇条書き・表のセルは敬体にする。
  プロンプト雛形などコードフェンス内で訳す地の文も敬体にする
- subagent / worktree / TDD などの技術用語は英語のまま（下の「英語のまま使う用語」）
- 「〜が効く」「〜が効かない」（「効い」「効か」「効け」を含む活用形すべて）を使わない。
  「〜に有効」「〜にうまく機能する」「〜にとって重要」などを文脈に応じて使う
- 翻訳する: SKILL.md 本文、frontmatter の `description`、サブエージェント用プロンプト
  （`*-prompt.md`、`code-reviewer.md` 等）、references / templates の md、
  `hooks/session-start` が注入する文言
- 英語のまま残す（検査スクリプトが検出するものを含む）:
  - スキル名・ディレクトリ名・frontmatter の `name`
  - コード・コマンド・スクリプト・非 md ファイル全般（`.js` `.cjs` `.sh` `.ts` `.dot` `.html` 拡張子なしスクリプト）、パス
  - `<HARD-GATE>` `<EXTREMELY-IMPORTANT>` `<SUBAGENT-STOP>` `<Good>` `<Bad>` などのタグ（タグの中身は訳す）
  - `superpowers:<スキル名>` 形式のスキル参照（個数も変えない）
  - URL
  - `[HEAD_SHA]` `[BRIEF_FILE]` などの全大文字の角括弧プレースホルダ
  - エージェント間のステータス語 `DONE` `DONE_WITH_CONCERNS` `BLOCKED` `NEEDS_CONTEXT` `ADDRESSED`
  - 計画書見出しの `Task` リテラル（`### Task 1: ...`）。`subagent-driven-development/scripts/task-brief`
    が英語の `Task` で見出しを解析するため、計画書の見出し形式を指示・例示している箇所の `Task` は訳さない
  - `using-superpowers/references/` の codex / gemini / pi / antigravity / hermes / muse
    各 `*-tools.md`（ファイルごと原文のまま。`claude-code-tools.md` は翻訳する）

### 書式の扱い

- 見出し・リスト・表・太字・コードフェンスの構造は原文と同じにする。コードフェンス行の数を変えない
- インラインコード（`` `...` ``）は中身を変えない。`Ruling:` `Task <N>: parked — ...` のような
  ledger 行の書式もインラインコードのまま英語で残す
- コードフェンスの中身:
  - コード・コマンド・設定・スクリプトやツールの出力・ログ・トランスクリプト例: 英語のまま（コード内コメントも訳さない）
  - サブエージェントに渡すプロンプト・メッセージ雛形・文書テンプレート（計画書・レポート等の雛形）:
    地の文を訳す。`description:` `model:` `prompt: |` などのキー、プレースホルダ、`Task` 見出し、
    ステータス語は英語のまま
  - 指示文（鉄則・ゲート関数・手順の疑似コードなど、コードではない指示）: 地の文と同様に訳す。
    中のコマンド・コード・ツール出力は英語のまま
  - ```` ```dot ```` の図: ノード名・`label` の文字列を訳してよい。同じ文字列は図の中ですべて同じ訳にそろえ、
    文字列中のパス・スキル参照・コードは英語のまま。`digraph` 名・属性・構文は変えない
- 説明的な角括弧プレースホルダ（`[task name]` `[Scene-setting: ...]` など全大文字でないもの）は、
  角括弧を残して中身を訳してよい
- スクリプトやツールの英語出力、外部の英語文書（エラーメッセージ・ログ・Anthropic のドキュメント等）を
  引用している箇所は、引用部分を英語のまま残す。必要なら直後に括弧で訳を添える
- 全大文字による強調は、日本語では太字で表現してよい（原文が既に太字ならそのまま）
- 引用されたユーザーの発話やエージェントの思考の例（"Let's build X"、"Fix this bug"、危険信号の表の
  「考え」列、よくある自己正当化の表の「言い訳」列など）は訳して「」で囲む。英語の引用符 `"..."` は
  「」に置き換える。これらの例文は敬体にそろえず、話し言葉のまま訳す（例: 「まず情報を集めよう」）。
  その人がそう考える・言う言葉そのものを示すためで、地の文の敬体とは区別する
- 段落内の改行位置は原文に合わせなくてよい。ただし文の途中では改行しない
- frontmatter の `description` は YAML として妥当に保つ。原文が引用符で囲んでいれば囲みを維持する。
  半角の `: ` を含めるときは引用符で囲む

## 用語集

### 規範語

| 英語 | 訳語 | 備考 |
|------|------|------|
| MUST / must | 〜しなければなりません / 必ず〜してください | 強調形（MUST, **must**）は「必ず〜しなければなりません」 |
| ABSOLUTELY MUST | 絶対に〜しなければなりません | |
| MUST NOT / NEVER / never | 決して〜してはいけません / 〜してはいけません | NEVER（全大文字）は「決して〜してはいけません」 |
| Don't / Do not（指示） | 〜しないでください / 〜してはいけません | 基本は「〜しないでください」、強調付き（太字・全大文字）は「〜してはいけません」。下の注を参照 |
| ALWAYS / always | 常に〜してください / 常に〜します | |
| should / should not | 〜すべきです / 〜すべきではありません | must と区別する |
| REQUIRED | 必須 | **REQUIRED SUB-SKILL:** → **必須サブスキル:**、**REQUIRED BACKGROUND:** → **必須の前提知識:** |
| IMPORTANT: | 重要: | EXTREMELY IMPORTANT → 極めて重要 |
| CRITICAL: | 最重要: | |
| STOP | 止まってください | 「〜なら**止まってください**」。見出し「Red Flags - STOP」→「危険信号 - 止まってください」、「Red Flags - STOP and Start Over」→「危険信号 - 止まって最初からやり直してください」 |
| No exceptions | 例外はありません / 例外なし | 見出し・ラベルでは「例外なし」 |
| This is not negotiable. | これは交渉の余地がありません。 | |
| Period. | 以上です。 | 文末の念押し |

注: 箇条書きの Don't / Do not を「〜しない」のような短い言い方（体言止め・終止形）で訳してよいのは、
直前の見出しやラベル（"NEVER:" "No exceptions:" "Don't:" など）から、その箇条書きが禁止の列挙だと
明らかな場合に限る。それ以外は「〜しないでください」か「〜してはいけません」で訳す。「〜しません」は
事実の記述と区別できないので、禁止の意味では使わない。

### 人・役割

| 英語 | 訳語 | 備考 |
|------|------|------|
| your human partner / human partner | 人間のパートナー | 「あなたの」は省いてよい。the user と混同しない |
| the user | ユーザー | |
| controller | コントローラー | subagent を指揮するセッション |
| implementer | 実装者 | implementer subagent → 実装者 subagent |
| reviewer / task reviewer / final reviewer | レビュアー / タスクレビュアー / 最終レビュアー | |
| orchestrator | オーケストレーター | |
| agent / subagent | エージェント / subagent | subagent は英語のまま |
| harness | ハーネス | Claude Code・Codex などの実行環境 |

### スキル・作業の流れ

| 英語 | 訳語 | 備考 |
|------|------|------|
| skill | スキル | |
| invoke (a skill) | （スキルを）呼び出す | use → 使う。区別する |
| announce | 宣言する | |
| dispatch (a subagent) | （subagent を）ディスパッチする | spawn → 起動する |
| fresh subagent | 新しい subagent | |
| process skill / implementation skill | プロセススキル / 実装スキル | |
| spec | 仕様 / 仕様書 | 文書を指すときは仕様書。spec compliance → 仕様準拠 |
| design / design doc | 設計 / 設計ドキュメント | |
| plan | 計画 / 計画書 | 文書を指すときは計画書。plan mode は英語のまま |
| brief / task brief | ブリーフ / タスクブリーフ | |
| ledger | ledger | 英語のまま（`progress.md` の進捗記録） |
| workspace | ワークスペース | |
| review package | レビューパッケージ | |
| ruling / Rulings I made | 裁定 / 自分が下した裁定 | 最終メッセージの見出し名はどのファイルでも「自分が下した裁定」にそろえる |
| finding | 指摘 | |
| Deferred minors / Declined to judge | 先送りした Minor / 判断を見送った事項 | 最終メッセージの見出し。重大度ラベル Critical / Important / Minor は英語のまま |
| fix loop | 修正ループ | |
| cap | 上限 | |
| park | 保留する | ledger 行の `parked` はインラインコードのまま |
| self-review | セルフレビュー | |
| handoff | 引き継ぎ | |
| compaction | コンテキスト圧縮 | |
| spike | 試作 | 強調が必要な箇所は「使い捨ての試作」 |
| checklist / todo | チェックリスト / todo | todo は英語のまま（Claude Code のツール用語） |
| brainstorm | ブレインストーミングする | |
| evidence / claim | 証拠 / 主張 | |
| root cause | 根本原因 | |
| baseline | ベースライン | |
| pressure scenario | 圧力をかけるテストシナリオ | |
| loophole | 抜け穴 | |
| rationalize / rationalization | 自己正当化する / 自己正当化 | 「合理化」は使わない。You cannot rationalize your way out of this → 自己正当化して逃れることはできません |
| the letter / the spirit (of the rules) | （ルールの）文言 / 精神 | |
| HARD-GATE | `<HARD-GATE>` タグはそのまま | タグの中身は訳し、強さを保つ |

### 英語のまま使う用語

subagent, worktree, TDD, YAGNI, DRY, RED, GREEN, REFACTOR（Red-Green-Refactor も英語のまま）,
todo, plan mode, commit・push・merge などの git 操作名はコード中では英語（地の文ではコミット・プッシュ・マージ）,
ツール名（`Skill` `Agent` `Task` `Bash` など）, ステータス語, スキル名

### 定型見出し

他ファイルから「〜を参照」と名指しされる見出しは、ここの訳にそろえる。新たに名指しされる見出しを訳したら追記する。

| 英語 | 訳語 |
|------|------|
| Overview | 概要 |
| When to Use | 使うとき |
| Quick Reference | クイックリファレンス |
| Common Mistakes | よくある間違い |
| Common Rationalizations | よくある自己正当化 |
| Red Flags | 危険信号 |
| Red Flags - STOP / Red Flags - STOP and Start Over | 危険信号 - 止まってください / 危険信号 - 止まって最初からやり直してください |
| The Iron Law | 鉄則 |
| Core principle | 基本原則 |
| Real-World Impact | 実際の影響 |
| The Process | プロセス |
| Gate Function | ゲート関数 |
| Model Selection | モデル選択 |
| Setup | セットアップ |
| Final Review | 最終レビュー |
| The Rule | ルール |
| Skill Priority | スキルの優先順位 |
| Platform Adaptation | プラットフォームへの適応 |
| User Instructions | ユーザーの指示 |
| Thought / Reality（表の列） | 考え / 現実 |
| Excuse / Reality（表の列） | 言い訳 / 現実 |

## 翻訳手順

Task 4〜10 の実装者は、担当スキルごとに次の手順で翻訳する。

1. 担当スキルの全 md を upstream と並べて読む（`$UPSTREAM/skills/<担当スキル>/` と
   `plugins/superpowers/skills/<担当スキル>/`）。翻訳は upstream の原文を見ながら行う
2. このファイルの「翻訳方針」と「用語集」に従って訳す。用語集にない頻出語・他ファイルから名指しされる
   見出しは、このファイルの用語集に追記してから使う
3. 検査が合格（終了コード 0）するまで直す。

   ```sh
   python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2" --skill <担当スキル>
   ```

   `--skill` は複数指定できる。終了コード 0 = 合格、1 = 不合格（ファイル単位で不合格項目を出力）。
   検査内容: ファイル構成、非 md ファイルのバイト一致、md ごとの保持検査（`superpowers:<スキル名>` 参照・URL・
   `<TAG>`・全大文字の `[PLACEHOLDER]`・ステータス語・コードフェンス行数・`# Task ` 見出し数）、
   リンクと frontmatter の解決、翻訳済み判定（かなを含むか、description が訳されているか）、
   「効く」系の禁止表現。`--structure-only` を付けると翻訳済み判定と禁止表現を省く
4. 原文と訳文を段落単位で読み比べ、次の漏れがないことを確認する。
   - 規範語の強さ（MUST / NEVER / should の区別、全大文字・太字の強調）
   - 条件（if / when / only / unless / before / after）
   - 否定（not / never / no / without）
   - 列挙（箇条書き・表の行・文中の並列）の項目数と順序

## 接頭辞を変更するとき

プラグイン名（スキル参照の接頭辞 `superpowers`）を変えるときは次の 4 点を更新する。

1. `plugins/superpowers/.claude-plugin/plugin.json` と `plugins/superpowers/.devin-plugin/plugin.json` の `name`
2. 全 md の `superpowers:` 参照の一括置換
3. リポジトリ直下の `.claude-plugin/marketplace.json`
4. `claude/.claude/settings.json` の `enabledPlugins`

あわせて `hooks/session-start` の注入文言中のスキル参照と、`scripts/check-translation.py` の
参照検出の正規表現（`superpowers:`）も新しい接頭辞に合わせる。
