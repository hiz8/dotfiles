# commit スキルの拡張の置き場所を git config で指定する Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** 拡張ディレクトリを固定の `.claude/commit/` ではなく、git config `commit-skill.extensionDir` で指定する形にする。

**Architecture:** `findExtension(cwd)` は git config からパスを読み、メインの作業ツリーのルートを基準に解決して、今の `loadExtension` で読み込む。候補を順に探す処理は廃止する。CLI と `checkMessage` は変えない。

**Tech Stack:** Node.js 24（標準ライブラリのみ、`node:test`）、git 2.56、Markdown

**Spec:** `docs/superpowers/specs/2026-11-25-commit-extension-git-config-design.md`

## Global Constraints

- キー名は `commit-skill.extensionDir`。読むのは `git -C <cwd> config --type=path --get commit-skill.extensionDir`（スコープは問わない。文書では `--local` を推奨する）
- 相対パスの基準は、メインの作業ツリーのルート（`rev-parse --path-format=absolute --git-common-dir` の basename が `.git` ならその親、それ以外は `--show-toplevel`）
- 設定がない（`git config` の終了コード 1）・git の外 → `null`。暗黙の既定ディレクトリは探さない
- 設定があり、指すパスが存在しない・ディレクトリでない・リンク切れ・中身が壊れている → `ExtensionError`
- `Extension` の形、`--show-rules` の出力、終了コードは変えない
- 共通スキルに u-motion-front 固有の名前を書かない。文書は敬体・規範表現
- テストはファイルパスを指定して実行する。コミットは commit-procedure.md の手順（`-F`、Co-Authored-By なし）

## Review Focus

1. linked worktree から相対パスの設定を読む → メインの作業ツリー基準で解決される（Task 1 でテスト）
2. `.claude/commit/` があっても設定がない → `null`（暗黙に探さない）（Task 1 でテスト）
3. 設定はあるがディレクトリがない → `ExtensionError`（Task 1 でテスト）
4. テストがユーザーのグローバル git 設定（`commit-skill.extensionDir` を含む）に左右されない（Task 1・2 の環境設定）

---

### Task 1: git config による拡張の発見

**Files:**
- Modify: `claude/.claude/skills/commit/scripts/lib/extension.mjs`
- Modify: `claude/.claude/skills/commit/test/extension.test.mjs`
- Modify: `claude/.claude/skills/commit/test/check-commit-message.test.mjs`（CLI 節のヘルパー）

**Interfaces:**
- Produces: `export const CONFIG_KEY = "commit-skill.extensionDir"`。`findExtension(cwd)` のシグネチャと戻り値は今のまま。`EXTENSION_DIR` は削除する

- [ ] **Step 1: テストを書き換える**

- 両テストファイルの先頭で、`GIT_DIR` などの削除に加えて `process.env.GIT_CONFIG_GLOBAL = "/dev/null"` と `process.env.GIT_CONFIG_NOSYSTEM = "1"` を設定する（in-process の `findExtension` と子プロセスの両方をグローバル設定から切り離すため）
- `writeExt(root, …)` は拡張ディレクトリを書くだけにし、場所を引数で受け取る: `writeExt(dir, config = VALID, { guide = true } = {})`
- `setExtDir(repo, value)`: `git -C repo config --local commit-skill.extensionDir <value>`
- extension.test.mjs のテスト（既存の「current worktree 優先」「main worktree から見つける」「broken worktree」は削除し、次に置き換える）:
  - `returns null outside a git repository`（そのまま）
  - `returns null when not configured`: `makeRepo()` → `null`
  - `does not look for an implicit directory`: `<repo>/.claude/commit` に `writeExt` したが設定なし → `null`
  - `finds configured relative directory from a subdirectory`: `writeExt(<repo>/.claude/docs/commit)`、`setExtDir(repo, ".claude/docs/commit")`、`<repo>/src/a` から呼ぶ → `realpathSync(dir)` が一致
  - `resolves relative directory against the main worktree`: メインに `writeExt` と設定、linked worktree から呼ぶ → `dir` がメイン側
  - `accepts an absolute directory`: リポジトリ外の一時ディレクトリに `writeExt`、その絶対パスを設定 → `dir` が一致
  - `throws when configured directory is missing`: 存在しないパスを設定 → `ExtensionError`
  - 既存の `throws on broken extension: …` の各ケースは、`setExtDir(repo, "ext")` と `<repo>/ext` に対して同じ内容で残す（リンク切れ・通常ファイルのケースも `<repo>/ext` に作る）
  - `anchors a pattern without caret` と `uses custom guide name` は設定を使う形にして残す
- check-commit-message.test.mjs の CLI 節: `writeExt` の後に `setExtDir(repo, ".claude/commit")` を呼ぶ（テストの意味は変えない）。`broken extension exits 2` も同様に設定する

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/extension.test.mjs claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: FAIL（`does not look for an implicit directory`、`finds configured relative directory…`、`resolves relative directory…`、`accepts an absolute directory`、`throws when configured directory is missing` などが失敗する）

- [ ] **Step 3: `findExtension(cwd)` を書き換える**

`rev-parse` が失敗したら `null`。`git config --type=path --get CONFIG_KEY` の終了コードが 1 なら `null`、それ以外の非 0 は `ExtensionError`。値が空文字列なら `ExtensionError`。`path.resolve(mainRoot, value)` を `lstatSync(…, { throwIfNoEntry: false })` で確かめ、ないなら `ExtensionError`（`<パス> がありません (commit-skill.extensionDir)`）、あれば `loadExtension`。先頭コメントを新しい発見方法に書き換える。

- [ ] **Step 4: テストを実行して合格を確認する**

Run: Step 2 と同じ
Expected: PASS（全件）

- [ ] **Step 5: コミット**

例: `feat: commit スキルの拡張の置き場所を git config で指定する`

### Task 2: 規約と手順書の更新

**Files:**
- Modify: `claude/.claude/skills/commit/references/commit-procedure.md`（手順 1 の拡張の説明）
- Modify: `claude/.claude/skills/commit/references/commit-rules.md`（「コミット種別」節の拡張の項目）

- [ ] **Step 1: 文書を更新する**

- commit-procedure.md: 「検証ツールは作業ディレクトリからリポジトリ別拡張（`.claude/commit/`）を探します。」を、「検証ツールは、リポジトリの git config `commit-skill.extensionDir` に指定されたディレクトリをリポジトリ別拡張として読みます。」に変える。続く「コミットするリポジトリの中で実行してください」は残す
- commit-rules.md: 「リポジトリに拡張（`.claude/commit/`）がある場合は」を「リポジトリに拡張（git config `commit-skill.extensionDir` で指定したディレクトリ）がある場合は」に変え、下位項目に設定方法を 1 つ足す: 「設定例: `git config --local commit-skill.extensionDir <パス>`。相対パスはメインの作業ツリーのルートから解決され、全 worktree で共有されます。ディレクトリには `config.json` と接頭辞ガイドを置きます。」

- [ ] **Step 2: 動作を確認する**

Run:
```bash
cd claude/.claude/skills/commit && node --test test/check-commit-message.test.mjs test/extension.test.mjs
grep -rn '\.claude/commit' scripts references SKILL.md
```
Expected: テストは全件 PASS。grep は何も出力しない（終了コード 1）

- [ ] **Step 3: コミット**

例: `docs: commit スキルの拡張の指定方法を git config に変更`
