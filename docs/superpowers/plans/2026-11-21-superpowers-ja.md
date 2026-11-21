# superpowers 日本語版プラグイン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** superpowers v7.0.2 の全 15 スキルを、内容は変えずに日本語訳したプラグインを、dotfiles の `plugins/superpowers/` に作り、元プラグインと置き換える。

**Architecture:** upstream v7.0.2 を必要なファイルだけ英語のままコピーしてコミットし（ベースライン）、その後スキル単位で翻訳する。翻訳の機械的な正しさ（ファイル構成・非 md の同一性・参照・プレースホルダ・プロトコル語の保持）は検査スクリプト `check-translation.py` で upstream と突き合わせて確認し、意味と強さの忠実さはレビューで確認する。リポジトリ直下の `.claude-plugin/marketplace.json` でローカル marketplace にする。

**Tech Stack:** Claude Code plugin（`.claude-plugin/plugin.json` / `hooks/hooks.json`）、Devin CLI manifest（`.devin-plugin/plugin.json`）、GNU Stow、bash、Python 3（標準ライブラリのみ）

**Spec:** `docs/superpowers/specs/2026-11-21-superpowers-ja-design.md`

## Global Constraints

- 翻訳元: obra/superpowers タグ `v7.0.2`、コミット `22f0b463e7a5e579904dd6211a520321035526f7`
- upstream の参照コピーは `UPSTREAM=${TMPDIR:-/tmp}/superpowers-v7.0.2` に clone して使う（プラグインキャッシュは元プラグイン無効化後に消える可能性があるため使わない）
- プラグイン名は `superpowers` のまま。marketplace 名は `hiz-dotfiles`。プラグイン ID は `superpowers@hiz-dotfiles`
- 英語のまま残すもの: スキル名・ディレクトリ名・frontmatter の `name`、コード・コマンド・スクリプト・非 md ファイル全般、パス、`<HARD-GATE>` `<EXTREMELY-IMPORTANT>` `<SUBAGENT-STOP>` などのタグ、`superpowers:xxx` 参照、URL、`[HEAD_SHA]` などの角括弧プレースホルダ、エージェント間のステータス語（`DONE` `DONE_WITH_CONCERNS` `BLOCKED` `NEEDS_CONTEXT` `ADDRESSED`）、計画書見出しの `Task` リテラル
- `using-superpowers/references/` の codex / gemini / pi / antigravity / hermes / muse 各 `*-tools.md` は原文のまま（`claude-code-tools.md` は翻訳する）
- 文体は敬体（です・ます調）で簡潔に（2026-11-21 ユーザー決定で常体から変更）。subagent / worktree / TDD などの技術用語は英語のまま
- MUST / NEVER / IMPORTANT 等の規範語は日本語でも同等の強さで表現する。意味の追加・削除・言い換えによる改変をしない
- 「〜が効く」「〜が効かない」（「効い」「効か」を含む活用形すべて）を使わない
- 用語集・翻訳手順は `plugins/superpowers/UPSTREAM.md` に置き、全スキルで従う
- tracked な `claude/.claude/settings.json` にマシン固有の絶対パスを書かない
- コミットはユーザーの commit スキル（`~/.claude/skills/commit/references/commit-procedure.md`）の規約に従う。push はしない

## Review Focus

- **description の翻訳でスキルが呼び出されなくなる**: 日本語の依頼に対し、該当スキルが従来どおり自動で呼び出されること。Task 11 の headless 呼び出し確認で検証する
- **エージェント間プロトコル語やプレースホルダの訳出**: implementer が `DONE` の代わりに「完了」と返すとコントローラーが判定できない。`check-translation.py` の保持検査（Task 2）で全ファイルを検査する
- **コードブロック内のプロンプトテンプレート**: `builder-check-prompt.md` などはコードブロック内の英文が翻訳対象である一方、同じブロック内のプレースホルダは保持が必要。保持検査はコードブロック内も対象にする
- **`./install.sh` 引数なし実行で `plugins/` `docs/` が `$HOME` に stow される**: Task 2 で除外を実装し、実行して確認する
- **英語版と日本語版の同時有効化**: Task 11 で `enabledPlugins` を確認し、セッション開始時の注入が日本語版 1 回だけであることを確認する

---

### Task 1: Copilot CLI / Devin CLI の導入方式を調査する

調査のみ。結果次第で配置を変える可能性があるため最初に行う。

**Files:**
- Create: `docs/superpowers/specs/2026-11-21-superpowers-ja-cli-research.md`

**Interfaces:**
- Produces: 調査メモ。Task 12 がここから README の導入手順を書く。結論は「A: 設計どおりの配置で両 CLI とも導入可」「B: 配置の調整で導入可（必要な調整を明記）」「C: 導入不可」のいずれか

- [ ] **Step 1: Copilot CLI を調査する** — 公式ドキュメント（GitHub Docs の Copilot CLI plugins / marketplace）と upstream の `obra/superpowers-marketplace` を読み、`copilot plugin marketplace add hiz8/dotfiles` でリポジトリ直下の `.claude-plugin/marketplace.json` を読めるか、marketplace の `source` にサブディレクトリ（`./plugins/superpowers`）を指定できるかを確認する。出典 URL を記録する
- [ ] **Step 2: Devin CLI を調査する** — Devin CLI のドキュメントを読み、`devin plugins install` がサブディレクトリのプラグインや marketplace を扱えるか、リポジトリ直下に `.devin-plugin/plugin.json` が必要かを確認する。出典 URL を記録する
- [ ] **Step 3: 調査メモを書く** — CLI ごとに導入コマンド、必要なファイル配置、出典、結論（A/B/C）を書く
- [ ] **Step 4: 判定する** — A なら次へ。B なら必要な配置調整をユーザーに提示して承認を得てから次へ（承認された調整は Task 2 の Files に反映する）。C ならここで停止し、独立リポジトリへの切り出しをユーザーに相談する
- [ ] **Step 5: Commit**

### Task 2: 英語ベースラインと検査スクリプトを用意する

**Files:**
- Create: `plugins/superpowers/` 一式（upstream からコピー。対象は下記）
- Create: `plugins/superpowers/scripts/check-translation.py`
- Create: `.claude-plugin/marketplace.json`
- Modify: `install.sh`（パッケージ列挙のループ）
- Modify: `CLAUDE.md`（`plugins/` と `docs/` は stow パッケージではないことを追記）

コピー対象（upstream のパスそのまま）: `skills/` 全体、`hooks/hooks.json`、`hooks/run-hook.cmd`、`hooks/session-start`、`.claude-plugin/plugin.json`、`.devin-plugin/plugin.json`、`LICENSE`。それ以外（`hooks/hooks-cursor.json`、他ハーネスのマニフェスト、`tests/`、`docs/`、`scripts/` など）はコピーしない。実行権限は upstream と同じに保つ。

**Interfaces:**
- Produces: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream DIR [--skill NAME ...] [--structure-only]`
  - 終了コード 0 = 全検査合格、1 = 不合格（不合格項目をファイル単位で出力）
  - `--structure-only`: 下記 1〜4 のみ実行
  - `--skill`: 5〜6 の対象を指定スキルに限定（1〜4 は常に全体）
- Produces: `.claude-plugin/marketplace.json` の `name` = `hiz-dotfiles`、`plugins[0].name` = `superpowers`、`plugins[0].source` = `./plugins/superpowers`

検査内容（いずれも upstream の同じパスのファイルと比較）:
1. ファイル構成: プラグイン内のファイル集合 = upstream のコピー対象の集合 + `scripts/check-translation.py` + `UPSTREAM.md` + `README.md`（後者 2 つは存在しなくてもよい）
2. 非 md ファイル: バイト一致。ただし `hooks/session-start` と 2 つの `plugin.json` は除外
3. 保持検査（md ファイルごと、コードブロック内を含む）: 次の多重集合が upstream と一致する — `superpowers:[a-z-]+`、URL（`https?://\S+` を末尾の `)>.,` を除いて）、`<[A-Z][A-Z_-]+>` タグ、`\[[A-Z][A-Z0-9_ ]*\]` プレースホルダ、ステータス語 `DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT|ADDRESSED`（単語境界）、コードフェンス行（行頭 ```` ``` ````）の数、見出し行 `^#+\s+Task\s` の数
4. 参照解決: すべての `superpowers:<x>` について `skills/<x>/` が存在する。md 内の相対リンク `](path)`（URL とアンカーのみのものを除く）がファイルとして存在する。各 `SKILL.md` の frontmatter に `name` があり、ディレクトリ名と一致し、`description` が空でない
5. 翻訳済み: 対象スキルの md ファイル（原文維持の `*-tools.md` 6 ファイルを除く）がひらがな・カタカナを含み、`SKILL.md` の `description` もひらがな・カタカナを含む。原文維持の 6 ファイルは upstream とバイト一致
6. 禁止表現: 対象スキルの md に `効く|効か|効い|効け` が含まれない

- [ ] **Step 1: upstream を clone して検証する**

Run: `git clone --depth 1 --branch v7.0.2 https://github.com/obra/superpowers "${TMPDIR:-/tmp}/superpowers-v7.0.2" && git -C "${TMPDIR:-/tmp}/superpowers-v7.0.2" rev-parse HEAD`
Expected: `22f0b463e7a5e579904dd6211a520321035526f7`

- [ ] **Step 2: コピー対象を `plugins/superpowers/` にコピーし、`.claude-plugin/marketplace.json` を作る**
- [ ] **Step 3: `check-translation.py` を実装する** — 上記 1〜6。Python 標準ライブラリのみ
- [ ] **Step 4: 検査スクリプトの動作確認（合格側）**

Run: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2" --structure-only`
Expected: 終了コード 0

- [ ] **Step 5: 検査スクリプトの動作確認（不合格側）** — 一時的に次の改変を 1 つずつ加え、それぞれ終了コード 1 と該当項目の出力を確認してから元に戻す: `skills/subagent-driven-development/implementer-prompt.md` の `DONE_WITH_CONCERNS` を 1 つ「懸念付き完了」に置換 / `skills/brainstorming/builder-check-prompt.md` の `[DOCUMENT_PATH]` を削除 / `skills/brainstorming/scripts/helper.js` に 1 文字追加 / `skills/writing-plans/SKILL.md` の `### Task N:` を `### タスク N:` に置換

Run（改変なしで）: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2"`
Expected: 終了コード 1、15 スキルすべてが「未翻訳」として報告される（翻訳前なので正しい失敗）

- [ ] **Step 6: `install.sh` から `plugins` と `docs` を除外する** — 引数なしのときの列挙から除く。引数で明示された場合も stow しない（エラーにする）
- [ ] **Step 7: install.sh を確認する**

Run: `./install.sh 2>&1 | grep -E "Stowing (plugins|docs)"; test ! -e ~/plugins && test ! -e ~/docs && echo OK`
Expected: grep の出力なし、`OK`。stow の衝突など別のエラーが出た場合は対処せず報告する

- [ ] **Step 8: `CLAUDE.md` に、`plugins/`（Claude Code プラグイン）と `docs/`（設計・計画ドキュメント）は stow パッケージではないことを追記する**
- [ ] **Step 9: Commit** — 英語ベースラインのコミット。翻訳差分を後でファイル単位でレビューできるようにするため、翻訳を混ぜない

### Task 3: 用語集・翻訳手順と using-superpowers・フックの翻訳

文体の基準を決めるタスク。最後にユーザー確認を挟む。

**Files:**
- Create: `plugins/superpowers/UPSTREAM.md`
- Modify: `plugins/superpowers/skills/using-superpowers/SKILL.md`
- Modify: `plugins/superpowers/skills/using-superpowers/references/claude-code-tools.md`
- Modify: `plugins/superpowers/hooks/session-start`（`session_context=` の文言のみ。`superpowers:using-superpowers` と `<EXTREMELY_IMPORTANT>` タグは保持）
- Modify: `plugins/superpowers/.claude-plugin/plugin.json`、`plugins/superpowers/.devin-plugin/plugin.json`（`description` を日本語化、`version` を `7.0.2-ja.1` に。`name` は変えない）

**Interfaces:**
- Produces: `UPSTREAM.md` の構成 — 「翻訳元」（タグ・コミット・clone コマンド）、「翻訳方針」（Global Constraints の翻訳関連項目）、「用語集」（英語 → 訳語の表）、「翻訳手順」（Task 4〜10 の実装者が従う手順。下記）、「接頭辞を変更するとき」（spec の更新箇所 4 点）
- 翻訳手順の内容: (1) 担当スキルの全 md を upstream と並べて読む (2) 用語集に従って訳す。用語集にない頻出語は追記する (3) `check-translation.py --skill <担当スキル>` が合格するまで直す (4) 原文と訳文を段落単位で読み比べ、規範語の強さ・条件・否定・列挙の漏れがないことを確認する

- [ ] **Step 1: 全スキルを通読し、用語集を作る** — 少なくとも次を含める: your human partner、skill / invoke、spec / design / plan、controller / implementer / reviewer、brief、Red Flags、rationalize、HARD-GATE の扱い、RED / GREEN / REFACTOR（英語のまま）
- [ ] **Step 2: `UPSTREAM.md` を書く**
- [ ] **Step 3: 未翻訳の失敗を確認する**

Run: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2" --skill using-superpowers`
Expected: 終了コード 1（using-superpowers が未翻訳）

- [ ] **Step 4: using-superpowers の 2 ファイル、session-start の文言、2 つの plugin.json を翻訳する**
- [ ] **Step 5: 検査が合格することを確認する**（Step 3 と同じコマンド、終了コード 0）
- [ ] **Step 6: フックの出力を確認する**

Run: `CLAUDE_PLUGIN_ROOT="$PWD/plugins/superpowers" bash plugins/superpowers/hooks/run-hook.cmd session-start | python3 -I -c 'import json,sys; c=json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"]; assert "superpowers:using-superpowers" in c and "<EXTREMELY_IMPORTANT>" in c; print(c[:400])'`
Expected: JSON として解析でき、日本語の文言と翻訳済み SKILL.md の冒頭が表示される

- [ ] **Step 7: ユーザー確認** — 用語集と using-superpowers の訳文をユーザーに見せ、文体・訳語の承認を得る。修正があれば反映し、Step 5 を再実行する
- [ ] **Step 8: Commit**

### Task 4: brainstorming を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/brainstorming/{SKILL.md,visual-companion.md,builder-check-prompt.md}`

**Interfaces:**
- Consumes: `UPSTREAM.md` の用語集・翻訳手順、`check-translation.py`

- [ ] **Step 1: 未翻訳の失敗を確認する** — `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2" --skill brainstorming`、終了コード 1
- [ ] **Step 2: `UPSTREAM.md` の翻訳手順に従って翻訳する** — `builder-check-prompt.md` はコードブロック内のプロンプト本文も訳し、`[DOMAIN, ...]` `[DOCUMENT_PATH]` は保持する。`scripts/` 配下は触らない
- [ ] **Step 3: 検査が合格することを確認する**（Step 1 と同じコマンド、終了コード 0）
- [ ] **Step 4: Commit**

### Task 5: writing-plans と executing-plans を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/writing-plans/SKILL.md`
- Modify: `plugins/superpowers/skills/executing-plans/SKILL.md`

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — `--skill writing-plans --skill executing-plans`、終了コード 1
- [ ] **Step 2: 翻訳する** — writing-plans の計画書テンプレート内の見出し `### Task N:` は英語のまま。テンプレート内の他の見出し・説明文は訳す。`task-start` / `task-done` が出力する英文（`wrote ...: N lines` など）を引用している箇所は原文のまま
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: task-brief で見出しが解析できることを確認する**

Run: `bash plugins/superpowers/skills/subagent-driven-development/scripts/task-brief docs/superpowers/plans/2026-11-21-superpowers-ja.md 5`（引数の形式は script 冒頭の usage に従う）
Expected: `wrote ...: N lines`（N > 0）

- [ ] **Step 5: Commit**

### Task 6: subagent-driven-development を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/subagent-driven-development/` 配下の md 11 ファイル（`SKILL.md`、`implementer-prompt.md`、`task-reviewer-prompt.md`、`re-review-prompt.md`、`references/*.md`）

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — `--skill subagent-driven-development`、終了コード 1
- [ ] **Step 2: 翻訳する** — ステータス語・プレースホルダ・スクリプト名と引数は保持。`scripts/` 配下は触らない
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: Commit**

### Task 7: test-driven-development・systematic-debugging・verification-before-completion を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/test-driven-development/{SKILL.md,writing-good-tests.md}`
- Modify: `plugins/superpowers/skills/systematic-debugging/{SKILL.md,condition-based-waiting.md,defense-in-depth.md,root-cause-tracing.md}`
- Modify: `plugins/superpowers/skills/verification-before-completion/SKILL.md`

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — 3 スキルを `--skill` で指定、終了コード 1
- [ ] **Step 2: 翻訳する** — コードブロック内のコード（コメント含む）は訳さない。`.ts` `.sh` は触らない
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: Commit**

### Task 8: レビュー・並列化・worktree・ブランチ完了系を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/requesting-code-review/{SKILL.md,code-reviewer.md}`
- Modify: `plugins/superpowers/skills/receiving-code-review/SKILL.md`
- Modify: `plugins/superpowers/skills/dispatching-parallel-agents/SKILL.md`
- Modify: `plugins/superpowers/skills/using-git-worktrees/SKILL.md`
- Modify: `plugins/superpowers/skills/finishing-a-development-branch/SKILL.md`

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — 5 スキルを `--skill` で指定、終了コード 1
- [ ] **Step 2: 翻訳する** — ユーザーに提示する選択肢の文面（finishing-a-development-branch など）も訳す
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: Commit**

### Task 9: writing-skills を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/writing-skills/SKILL.md`
- Modify: `plugins/superpowers/skills/writing-skills/references/*.md`（7 ファイル）

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — `--skill writing-skills`、終了コード 1
- [ ] **Step 2: 翻訳する** — `anthropic-best-practices.md` の `<img>` タグや URL は保持。スキルの良い例・悪い例として示された英語の frontmatter / description のサンプルは、説明文は訳し、サンプル自体は原文のまま残す（英語 description の書き方を説明する例のため）。`render-graphs.js` と `.dot` は触らない
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: Commit**

### Task 10: diagnosing-superpowers を翻訳する

**Files:**
- Modify: `plugins/superpowers/skills/diagnosing-superpowers/` 配下の md 20 ファイル（`SKILL.md`、`prompts/*.md`、`references/*.md`、`templates/*.md`）

**Interfaces:**
- Consumes: Task 4 と同じ

- [ ] **Step 1: 未翻訳の失敗を確認する** — `--skill diagnosing-superpowers`、終了コード 1
- [ ] **Step 2: 翻訳する** — `templates/issue.md` は upstream（英語の GitHub issue）に投稿する文面のテンプレートなので、見出しと本文の雛形は英語のまま残し、テンプレート内の記入者向け説明だけを訳す。他の templates は訳す
- [ ] **Step 3: 検査が合格することを確認する**（終了コード 0）
- [ ] **Step 4: 全スキルの検査**

Run: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2"`
Expected: 終了コード 0

- [ ] **Step 5: Commit**

注: Step 2 の `templates/issue.md` の例外で検査 5（ひらがな・カタカナを含む）に不合格になる場合は、記入者向け説明が日本語で含まれていれば合格するので、説明部分を確実に訳す。

### Task 11: Claude Code に導入して置き換える

**Files:**
- Modify: `claude/.claude/settings.json`（`enabledPlugins`）

**Interfaces:**
- Consumes: `.claude-plugin/marketplace.json`（Task 2）、翻訳済みプラグイン（Task 3〜10）

- [ ] **Step 1: marketplace を登録し、プラグインを導入する**

Run: `claude plugin marketplace add "$PWD" && claude plugin install superpowers@hiz-dotfiles && claude plugin disable superpowers@claude-plugins-official`
Expected: いずれも成功。コマンド名・サブコマンドが異なる場合は `claude plugin --help` で確認して同等の操作を行う

- [ ] **Step 2: settings.json の差分を確認する**

Run: `git diff claude/.claude/settings.json`
Expected: `enabledPlugins` に `"superpowers@hiz-dotfiles": true` が加わり、`superpowers@claude-plugins-official` が `false`（または削除）。`/home/` を含む絶対パスが追加されていない（追加されていたら取り除き、手動登録の手順を Task 12 の README に書く）

- [ ] **Step 3: SessionStart の注入を確認する** — 新しいセッションを headless で起動し、注入が日本語版 1 回だけであることを確認する

Run: `claude -p "セッション開始時に注入された using-superpowers の内容の最初の見出しと、その注入が何回あったかだけを答えて" --output-format text`
Expected: 日本語版の見出しが答えられ、注入は 1 回

- [ ] **Step 4: スキル呼び出しを確認する** — 次の各依頼で、対応するスキルが Skill ツールで呼び出されることを確認する

Run（依頼ごと）: `claude -p "<依頼>" --output-format stream-json --verbose --max-turns 3 | grep -o '"skill":"superpowers:[a-z-]*"' | head -1`
- 「ログイン画面に二段階認証を追加したい」→ `superpowers:brainstorming`
- 「このテストがときどき失敗する原因を調べて」→ `superpowers:systematic-debugging`
- 「この計画を実行して: docs/superpowers/plans/2026-11-21-superpowers-ja.md」→ `superpowers:subagent-driven-development` または `superpowers:executing-plans`

Expected: 各依頼で期待するスキル名が出る。出ない場合は upstream 版で同じ依頼を試して比較し、翻訳起因なら description を直してから再確認する

- [ ] **Step 5: `/plugin` の一覧で `superpowers@hiz-dotfiles` の 15 スキルが表示されることを確認する**（headless で確認できなければ、ユーザーに対話セッションで確認してもらう）
- [ ] **Step 6: Commit**

### Task 12: 導入手順と運用メモを書く

**Files:**
- Create: `plugins/superpowers/README.md`
- Modify: `README.md`（リポジトリの README に plugins/ の概要と README へのリンクを追記）

**Interfaces:**
- Consumes: Task 1 の調査メモ、Task 11 の導入手順

- [ ] **Step 1: `plugins/superpowers/README.md` を書く** — 内容: このプラグインの目的（upstream の日本語訳。カスタマイズの土台）、Claude Code での導入手順（Task 11 で実際に使ったコマンド）、Copilot CLI と Devin CLI での導入手順（Task 1 の調査結果。未検証であることを明記。push 済みの内容だけが反映されることも書く）、翻訳の編集後にプラグインを更新する手順、`check-translation.py` の使い方、`UPSTREAM.md` へのリンク
- [ ] **Step 2: リポジトリの `README.md` に追記する**
- [ ] **Step 3: 最終確認**

Run: `python3 -I plugins/superpowers/scripts/check-translation.py --upstream "${TMPDIR:-/tmp}/superpowers-v7.0.2" && git status --short`
Expected: 終了コード 0、未コミットの変更は README の 2 ファイルのみ

- [ ] **Step 4: Commit**
