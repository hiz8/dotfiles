# commit スキルの superpowers 形式への更新 Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** `claude/.claude/skills/commit/` を、置き場所は変えずに `plugins/superpowers/` のスキルと同じ書き方・構成へそろえ、将来プラグインへ移せる状態にする。

**Architecture:** 検証ツールを依存のない Node スクリプト 1 本（`scripts/check-commit-message.mjs` + `scripts/lib/commit-message.mjs`）にまとめ、commitlint 構成を削除する。SKILL.md と手順書はハードコードされた `~/.claude/skills/commit/...` をやめ、スキルの Base directory を `[SKILL_DIR]` として subagent に渡す形にする。文書は superpowers の文体（敬体）と見出しにそろえる。

**Tech Stack:** Node.js 24（標準ライブラリのみ、`node:test`）、Markdown

**Spec:** 本計画書の「背景」節（2026-11-25 の会話での提案 1〜4 から、プラグインへの移動と付随更新を除いたもの）

## 背景

- ユーザーは commit スキルを後で `plugins/superpowers` へ統合したい。今回はその準備だけを行う
- **対象外（ユーザー決定）**: `plugins/superpowers/skills/commit/` への移動、`check-translation.py`・UPSTREAM.md・バージョン・README・CLAUDE.md などプラグイン側の付随更新、`~/.claude/skills/commit`（実ディレクトリ）の削除や再インストール、過去の計画書（`docs/superpowers/plans/2026-11-21-superpowers-ja.md`）の旧パス
- 対象: 検証ツールの依存をなくす、パスの相対化、文体・書式の統一、スキル内のファイル配置を superpowers に合わせる（実行ファイルは `scripts/`、文書は `references/`）
- 判定の基準は `references/commit-rules.md` のテンプレート `<種別>: <タイトル> <Issue番号>` とする。現行の commitlint とも旧 `check-commit-message.mjs` とも完全には一致しないため、次を **commitlint との意図的な差異** とする: `feat(scope): x` と `feat!: x` は不合格（テンプレートにない形）、Merge / Revert / `fixup!` の git 生成メッセージを特別扱いしない（スキルはこの形を作らない）
- commit-rules.md の早すぎる改行の例外（57〜62 行目の 4 項目、空行の例外は書かれていない）は列挙の形を変えずに残す。手順書は Global Constraints の 3 項目で書くため、両者の列挙の形がずれるのは意図的。空タイトルの判定は Task 3 で commit-rules.md に `[機械]` の項目として追加する

## Global Constraints

- スキルの置き場所は `claude/.claude/skills/commit/` のまま。スキル名・frontmatter の `name` は `commit`
- 検証ツールは Node 標準ライブラリのみで動くこと。`package.json`・`node_modules`・`npm install` を使わない
- 判定内容: 種別 6 種（feat/fix/docs/refactor/test/chore）の `<種別>: ` プレフィックス必須、**タイトルが空でない（空白だけも不可）**、タイトル 50 コードポイント以内（種別と末尾 ` #123` を除く）、subject 直後の空行、本文の表示幅 80 桁以内（全角 2・半角 1）、早すぎる改行、装飾 `**` `【` `】`、Co-Authored-By 禁止、行頭 `#` のコメント行は除外（行番号は物理行のまま）
- 早すぎる改行の判定: 本文の行が 70 桁未満で次行が継続行のときに不合格。例外（70 桁未満でも合格）は、文末（`。．！？!?`）で終わる行、次行の先頭の語を繰り上げると 80 桁を超える行（URL・識別子などの長い ASCII 語を含む）、次行が空行またはリスト項目（`-` `*` `+` `1.` で始まる）の行
- CLI の終了コード: 0 = 合格、1 = 違反あり（空メッセージを含む）、2 = 入力を読めない
- 文書の文体は `plugins/superpowers/UPSTREAM.md` の「翻訳方針」の文体（敬体・規範語の強さ）と「用語集」に従う（例: サブエージェント → subagent、委譲 → ディスパッチ）。ただし **コミットメッセージ規約そのもの（作られるメッセージは常体・体言止め／現在形）は変えない**
- ツール名は `Agent`（`Task` ではない）。frontmatter に `allowed-tools` を書かない
- スキル内のファイル参照は `[SKILL_DIR]` からの相対で書く。`~/.claude/skills/commit` を文書に残さない
- 各タスクのコミットは、実装者が commit スキルの手順書 `commit-procedure.md` を **直接読んで従う**（SKILL.md 経由で subagent をディスパッチしない）。push はしない

## Review Focus

- **早すぎる改行の例外が消える**: 文末で終わる行、次語の繰り上げで 80 桁を超える行、次行が空行・リスト項目の行は 70 桁未満でも合格すべき。Task 1 のテストで固定する
- **空タイトル**: `feat: ` や `feat:    ` は不合格にすべき（旧スクリプトでは合格していた）。Task 1 のテストで固定する
- **git コメント行と行番号**: `#` の行は判定から外し、エラーの行番号は物理行のまま。Task 1 のテストで固定する
- **subject だけのコミットと CRLF**: 本文なしは合格、`\r\n` 区切りでも幅がずれない。Task 1 のテストで固定する
- **残るリスク（今回は検証しない）**: SKILL.md が Base directory の値を `[SKILL_DIR]` として subagent のプロンプトに入れる部分は、再インストールが対象外のため Skill 経由で試験できない。Task 2・3 で確かめられるのは、手順書が `[SKILL_DIR]` を受け取って相対パスを解けることだけ

---

### Task 1: 依存のない検証ツールへの一本化

**Files:**
- Create: `claude/.claude/skills/commit/scripts/lib/commit-message.mjs`（現 `lib/commit-message.mjs` を移し、`checkMessage` を追加）
- Create: `claude/.claude/skills/commit/scripts/check-commit-message.mjs`（CLI。判定は lib に任せる薄いラッパー）
- Create: `claude/.claude/skills/commit/test/check-commit-message.test.mjs`
- Delete: `check-commit-message.mjs`（直下）、`lib/`、`commitlint.config.mjs`、`commitlint-plugin-ja.mjs`、`verify-commit-message.sh`、`package.json`、`package-lock.json`、`test/parity.mjs`（いずれも `claude/.claude/skills/commit/` 配下）
- Modify: `.gitignore`（commit スキル用の `node_modules/` とそのコメントの 2 行を削除）

**Interfaces:**
- Produces: `checkMessage(raw: string): { empty: boolean, errors: Array<{ n: number, width: number, msg: string }>, lines: Array<{ n: number, text: string }> }`
  - `lines` は CRLF を LF に正規化した全物理行（コメント行を含む。`n` は 1 始まり）。CLI の `--verbose` はこれから表示幅一覧を作る
  - `errors` は `n` の昇順。`empty` は subject（コメント行を除いた先頭行）が空のとき true で、そのとき `errors` は空
- Produces: CLI `node [SKILL_DIR]/scripts/check-commit-message.mjs [--verbose] [<message-file>]`
  - ファイル省略時は標準入力
  - 合格: stdout に `OK: ` で始まる行、終了コード 0
  - 違反: stderr に `行<n> (幅=<w>): <msg>` を列挙、終了コード 1
  - 空メッセージ: stderr に `コミットメッセージが空です。`、終了コード 1
  - 読めない入力: 終了コード 2
  - `--verbose`: stderr に `--- 表示幅一覧 ---` と全行の `<n>: <幅>桁  <text>`

- [ ] **Step 1: 失敗するテストを書く**

`test/parity.mjs` の 9 フィクスチャのメッセージを移植し、`checkMessage` に通す。正常系は `errors` が空。違反 8 件は `errors.some(e => e.msg.includes(<部分文字列>))` を検証する。

| フィクスチャ | 部分文字列 |
|------|------|
| 種別なし | `コミット種別プレフィックスがありません` |
| 許可外の種別 perf | `コミット種別プレフィックスがありません` |
| タイトル 50 コードポイント超過 | `タイトルが 50 文字を超えています` |
| subject 直後の空行なし | `subject の直後には空行が必要です` |
| 全角で表示幅超過 | `表示幅が 80 桁を超えています` |
| 早すぎる改行 | `早すぎる改行です` |
| 装飾 `**` | `禁止された装飾` |
| Co-Authored-By | `Co-Authored-By トレーラーは禁止です` |

追加のケース（本文は `"feat: 追加\n\n" + 本文` で組み立てる。幅は `"a".repeat(n)` `"あ".repeat(n)` で作り、手計算しない）:
- `empty title`: `"feat: \n"` と `"feat:    \n"` → `errors` に `タイトルが空です` を含む
- `scope and breaking are rejected`: `"feat(scope): x\n"` と `"feat!: x\n"` → `コミット種別プレフィックスがありません`
- `early wrap: long ascii word`: `"- " + "a".repeat(66)`（68 桁）の次行が `"  " + "b".repeat(12)` → `errors` が空（繰り上げると 68 + 1 + 12 = 81 桁）
- `early wrap: sentence end`: `"- " + "あ".repeat(28) + "。"`（60 桁）の次行が `"  あいう"` → `errors` が空
- `early wrap: next is list item`: `"- " + "あ".repeat(29)`（60 桁、文末記号なし）の次行が `"- 次の項目"` → `errors` が空
- `early wrap: next is blank`: `"- " + "あ".repeat(29)`（60 桁、文末記号なし）の次行が空行、その次に `"- 次の項目"` → `errors` が空
- `ignores comment lines`: 1 行目 subject、2 行目 `"# comment"`、3 行目空行、4 行目 `"- " + "あ".repeat(40)`（82 桁）→ `errors` がちょうど 1 件で、その `n === 4`（コメント行を除外しない実装では「subject の直後には空行が必要です」が増えて 2 件になる）
- `subject only passes`: `"feat: 追加\n"` → `errors` が空、`empty === false`
- `crlf`: 本文行 `"- " + "あ".repeat(39)`（80 桁）を `\r\n` 区切りで → `errors` が空
- `empty message`: `""` と `"# only comment\n"` → `empty === true`

CLI（`spawnSync(process.execPath, [script, ...args], { input })`）:
- 合格ファイル → 終了コード 0、stdout が `OK: ` で始まる
- 違反ファイル → 終了コード 1、stderr に `行` を含む
- 空メッセージ → 終了コード 1、stderr に `コミットメッセージが空です。`
- 存在しないファイル → 終了コード 2
- 引数なしで標準入力に違反メッセージ → 終了コード 1
- `--verbose` 付きの合格ファイル → 終了コード 0、stderr に `--- 表示幅一覧 ---`

- [ ] **Step 2: 失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: FAIL（`scripts/lib/commit-message.mjs` が見つからない）

- [ ] **Step 3: `checkMessage` と CLI を実装する**

判定本体は現 `check-commit-message.mjs` の `main()` を `checkMessage` へ移し、行分解は既存の `parseStructure` を使う。定数・`displayWidth`・`firstMovableUnit` は lib の既存 export をそのまま使い、重複実装を残さない。空タイトルの判定を追加する（メッセージ `タイトルが空です`）。CLI は入力の読み込み・`--verbose`・終了コードだけを持つ。lib のヘッダーコメント（現 3〜5 行目）と `parseStructure` のコメント（現 71〜72 行目）から commitlint と旧実装への言及を消し、`checkMessage` と CLI の関係を書く。

- [ ] **Step 4: テストの合格を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: PASS（全テスト）

- [ ] **Step 5: 旧ファイルを削除し、残りがないことを確認する**

Files の Delete 一覧と `.gitignore` の 2 行を削除し、作業ツリーの `claude/.claude/skills/commit/node_modules/` も消す。

Run: `grep -rn "commitlint\|verify-commit-message\|npm install\|parity" claude/.claude/skills/commit/scripts claude/.claude/skills/commit/test .gitignore`
Expected: 出力なし（`SKILL.md` と `references/` に残る記述は Task 2・3 で書き直す）

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: PASS

- [ ] **Step 6: コミット**

インストール済みのコピーの手順書 `~/.claude/skills/commit/references/commit-procedure.md` を直接読んで従う（中身はリポジトリの Task 1 前の版と同じ）。

### Task 2: SKILL.md と手順書のパス相対化と文体統一

**Files:**
- Modify: `claude/.claude/skills/commit/SKILL.md`
- Modify: `claude/.claude/skills/commit/references/commit-procedure.md`

**Interfaces:**
- Consumes: Task 1 の CLI `node [SKILL_DIR]/scripts/check-commit-message.mjs [--verbose] <message-file>`
- Produces: プレースホルダ `[SKILL_DIR]`（スキルのディレクトリの絶対パス）。Task 3 の commit-rules.md もこれで参照する

- [ ] **Step 1: SKILL.md を書き直す**

- frontmatter: `allowed-tools` を削除。`description` は次の文言にする（現行の `HEREDOC` の記述は `-F` 方式と食い違うので外す）:

  ```
  description: ユーザーが「コミットして」と依頼したとき、または変更をコミット単位にまとめるときに使います - ローカルの変更を、コミット種別・タイトル・コミット内容（表示幅80桁ルール）の規約に沿ってコミットします
  ```

- 見出し: `# Commit`、`## 概要`、`## 手順`、`## 危険信号`（「自分で git を叩きたくなった」「diff を読み込みたくなった」→ 止まって subagent にディスパッチする）
- 手順 1: 自分で git の調査・ステージ・コミットをしてはいけない。スキル読み込み時に示される `Base directory for this skill:` の絶対パスを `[SKILL_DIR]` として、`Agent` で `general-purpose` の subagent を 1 つディスパッチする
- 手順 2: プロンプトに含めるもの: `[SKILL_DIR]` の実際の値、`[SKILL_DIR]/references/commit-procedure.md` を読んで厳密に従うこと、ユーザーの指示（対象・粒度・メッセージ）をそのまま、戻り値は手順書の「呼び出し元へ返すサマリ」だけ
- 手順 3（現行の手順 3 を残す）: subagent が返したサマリをユーザーに提示する。エラーや「コミット対象なし」が返った場合も、その内容をそのまま伝える
- 敬体。規範語は UPSTREAM.md の表の強さ（「〜してはいけません」など）

- [ ] **Step 2: commit-procedure.md を書き直す**

- 冒頭の関連ファイル節を「`[SKILL_DIR]` は呼び出し元から渡されたスキルの絶対パスです。渡されていなければ作業せず、その旨をサマリとして返してください」に置き換える（現 7 行目の「`~` は `$HOME` に展開する」は削除）
- `~/.claude/skills/commit/...` の 6 か所を `[SKILL_DIR]/...` に置き換える
- 手順 5 の機械チェックを Task 1 の CLI に差し替え、commitlint・`npm install`・英語メッセージに触れた記述を削除する（全メッセージが日本語になる）。早すぎる改行の例外の列挙は Global Constraints の 3 つにそろえる
- 「機械チェックで検証できないルール」冒頭の機械チェック項目の列挙を、Global Constraints の判定内容に合わせる
- 敬体・用語集（サブエージェント → subagent など）。**機械チェックの差し替え以外は**、手順の番号・内容と「呼び出し元へ返すサマリ」の項目を変えない

- [ ] **Step 3: 確認する**

Run: `grep -n -e '~/.claude' -e '\$HOME' -e commitlint -e verify-commit-message -e 'npm install' -e allowed-tools -e '\bTask\b' claude/.claude/skills/commit/SKILL.md claude/.claude/skills/commit/references/commit-procedure.md`
Expected: 出力なし

- [ ] **Step 4: 新しい手順書でコミットする**

実装者が `[SKILL_DIR]` = 実行中の作業ツリーにある `claude/.claude/skills/commit` の絶対パス（`git rev-parse --show-toplevel` の結果 + `/claude/.claude/skills/commit`）として、`[SKILL_DIR]/references/commit-procedure.md` を直接読んで従う。
Expected: 手順書の相対パスが解け、Task 1 の CLI で検証してコミットできる

### Task 3: commit-rules.md の文体統一と検証区分の更新

**Files:**
- Modify: `claude/.claude/skills/commit/references/commit-rules.md`

**Interfaces:**
- Consumes: Task 1 の CLI、Task 2 の `[SKILL_DIR]`

- [ ] **Step 1: commit-rules.md を書き直す**

- 冒頭の `[機械]` の説明を「`[SKILL_DIR]/scripts/check-commit-message.mjs` が自動検証する」に変える
- 「コミットタイトル」節に「タイトルを空にしない（空白だけも不可）。[機械]」を 1 項目追加する（Task 1 の空タイトル判定に対応）
- 規約の説明文を敬体にする。上の追加以外は、ルールの内容・`[機械]` / `[自己]` の区分・テンプレート・悪い例/良い例のコミットメッセージ本文を変えない
- 作られるメッセージの文体ルール（体言止め・現在形、です・ます調禁止）はそのまま残す

- [ ] **Step 2: 確認する**

Run: `grep -n "~/.claude\|commitlint\|verify-commit-message" claude/.claude/skills/commit/references/commit-rules.md`
Expected: 出力なし

Run（`F=claude/.claude/skills/commit/references/commit-rules.md`）: `for t in 機械 自己; do echo "$t $(git show HEAD:$F | grep -c "\[$t\]") $(grep -c "\[$t\]" $F)"; done`
Expected: `自己` は 2 つの数が一致、`機械` は 2 つ目が 1 つ目より 1 多い（空タイトルの項目の追加分だけ）

- [ ] **Step 3: 新しい手順書でコミットする**

Task 2 Step 4 と同じ方法でコミットする。
