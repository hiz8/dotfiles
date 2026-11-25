# commit スキルのリポジトリ別拡張 Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** リポジトリ側に置いた `.claude/commit/`（`config.json` + 接頭辞ガイド）で、commit スキルの subject 接頭辞の形式と選び方を差し替えられるようにする。

**Architecture:** 拡張の発見と読み込みを新しいモジュール `scripts/lib/extension.mjs` に分ける。`checkMessage` は接頭辞の定義を引数で受け取るだけにし、git やファイルを知らない。CLI が作業ディレクトリから拡張を探して `checkMessage` に渡し、`--show-rules` で使う規約を表示する。手順書は最初に `--show-rules` を実行し、拡張があれば接頭辞ガイドを読む。

**Tech Stack:** Node.js 24（標準ライブラリのみ、`node:test`）、git 2.56、Markdown

**Spec:** `docs/superpowers/specs/2026-11-25-commit-skill-repo-extension-design.md`

## Global Constraints

- 検証ツールは Node 標準ライブラリのみで動くこと（`package.json`・`npm install` を使わない）
- 拡張ディレクトリは `<作業ツリーのルート>/.claude/commit/`。探す順序は 1. `git rev-parse --show-toplevel` 2. メインの作業ツリーのルート（`--git-common-dir` から求める）。最初に見つかったものを使う
- 拡張がない、または git リポジトリの外では、今と完全に同じ判定（`feat|fix|docs|refactor|test|chore` + `: `）
- 拡張ディレクトリがあるのに設定が読めない・壊れている（`config.json` がない、JSON が不正、必須キーがない、正規表現が不正、接頭辞ガイドがない）場合は、共通規約に戻らず終了コード 2 で止める。型の不一致や、`.claude/commit` がディレクトリでない場合も含む（詳細は「決めたこと」）
- 本文の判定（表示幅 80、早すぎる改行、装飾、Co-Authored-By、subject 直後の空行）は拡張の有無にかかわらず共通
- タイトル長の上限は 50 コードポイントのまま。拡張時は、接頭辞の一致部分と末尾の Issue 番号（`\s+#\d+\s*$`）を除いて数える
- 共通スキルに u-motion-front 固有の名前・ラベル・ページ名を書かない（テストの例は架空のラベルを使う）
- 文書は今の敬体・規範表現（「〜してはいけません」「〜しないでください」）に合わせる。用語は「接頭辞ガイド」
- テストはファイルパスを指定して実行する（`node --test <dir>` は失敗する）
- コミットは `references/commit-procedure.md` の手順で行う（`git commit -F`、機械チェック合格、Co-Authored-By を付けない）

## 決めたこと（Spec の「ビルダーに任せること」への回答）

- `config.json` のキー:
  - `subjectPrefix`（必須, string）: 接頭辞の正規表現
  - `prefixError`（必須, string）: 違反時の説明文
  - `example`（必須, string）: 正しい subject の例
  - `guide`（任意, string, 既定 `prefix-guide.md`）: 接頭辞ガイドのファイル名。拡張ディレクトリからの相対
  - 上記以外のキーは無視する
  - トップレベルがオブジェクトでない（`null`・配列・文字列など）、必須キーが空でない文字列でない、`guide` が文字列でない場合は `ExtensionError`
- `.claude/commit` が存在するがディレクトリでない場合も `ExtensionError`（黙って共通規約に戻らないため）
- 正規表現は `new RegExp("^(?:" + src.replace(/^\^/, "") + ")", "u")` で先頭一致に揃える。一致が空文字列の場合は「接頭辞がない」とみなす。`u` フラグなので `\:` のような不要なエスケープは SyntaxError になり、`ExtensionError` として扱う（commit-rules.md に明記する）
- subagent は `node [SKILL_DIR]/scripts/check-commit-message.mjs --show-rules` で、使う規約と接頭辞ガイドのパスを知る
- テストは `os.tmpdir()` に一時リポジトリを作り、`git worktree add` で linked worktree を作る。作ったディレクトリはテスト終了時に削除する

## Review Focus

1. 接頭辞の正規表現が空文字列に一致する（例 `(\[[^\]]+\])*`）→ 接頭辞なしとして不合格になること（Task 2 でテスト）
2. 先頭に空白がある subject（u-motion-front の履歴に実在する ` [画面] 修正`）→ 拡張時は不合格になること（Task 2 でテスト）
3. 作業ツリーのサブディレクトリで CLI を実行する → ルートの拡張が見つかること（Task 1 でテスト）
4. linked worktree とメインの両方に拡張がある → linked worktree 側が使われること（Task 1 でテスト）
5. `.claude/commit/` はあるが `config.json` がない → 共通規約に戻らず終了コード 2（Task 1・Task 3 でテスト）

---

### Task 1: 拡張の発見と読み込み

**Files:**
- Create: `claude/.claude/skills/commit/scripts/lib/extension.mjs`
- Test: `claude/.claude/skills/commit/test/extension.test.mjs`

**Interfaces:**
- Produces:
  - `export class ExtensionError extends Error`（`message` は日本語で、原因のファイルパスを含む）
  - `export function findExtension(cwd: string): Extension | null`
  - `type Extension = { dir: string, guidePath: string, prefix: { re: RegExp, error: string, example: string } }`（`dir` と `guidePath` は絶対パス）
  - 拡張が見つからない、git リポジトリの外、`git rev-parse` が失敗した場合は `null`。拡張ディレクトリがあって壊れている場合は `ExtensionError` を投げる

- [ ] **Step 1: テストを書く**

テスト用ヘルパー（テストファイル内）:
- git はすべて `env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }` から `GIT_DIR`・`GIT_WORK_TREE`・`GIT_INDEX_FILE` を除いた環境で実行する（ユーザーの git 設定や git hook 経由の実行に左右されないため）。`findExtension` 自体は環境を変えない
- パスの比較はすべて `realpathSync` で揃える
- テストファイルの先頭で `delete process.env.GIT_DIR`（`GIT_WORK_TREE`・`GIT_INDEX_FILE` も）する。in-process で呼ぶ `findExtension` が呼び出し元の repo を見ないようにするため。Task 3 の `run()` の `spawnSync` にも、同じく除去した env を渡す
- `makeRepo()`: `mkdtempSync` で作ったディレクトリで `git init -q` し、`git -c user.name=t -c user.email=t@example.com commit -q --allow-empty -m init` する。`t.after` で `rmSync(..., { recursive: true, force: true })`
- `addWorktree(repo)`: `git -C repo worktree add -q <repo外の一時パス> -b wt-<連番>`
- `writeExt(root, config, { guide = true } = {})`: `<root>/.claude/commit/config.json` と `prefix-guide.md` を書く
- 有効な設定の例: `{ subjectPrefix: "^(\\[[^\\[\\]]+\\])+ ", prefixError: "接頭辞 [ラベル] がありません", example: "[設定画面] 保存ボタンを修正" }`

テスト（名前と主な assert）:
- `returns null outside a git repository`: git でない一時ディレクトリ → `null`
- `returns null when no extension directory`: `makeRepo()` → `null`
- `finds extension from a subdirectory`: ルートに `writeExt`、`<root>/src/a` から呼ぶ → `realpathSync(dir) === realpathSync(<root>/.claude/commit)`、`guidePath` が `prefix-guide.md` で終わる、`prefix.re.test("[設定画面] 修正") === true`
- `finds main worktree extension from a linked worktree`: メインに `writeExt`、worktree から呼ぶ → `dir` がメイン側（`realpathSync` で比較）
- `prefers the current worktree extension`: メインと worktree の両方に `writeExt`（`example` を変える）→ worktree 側の `example`
- `anchors a pattern without caret`: `subjectPrefix: "\\[x\\] "` → `re.test("a [x] b") === false`、`re.test("[x] b") === true`
- `broken worktree extension is not skipped`: メインは正常、worktree 側は `config.json` なし → worktree から呼ぶと `ExtensionError`（メインへ回り込まない）
- `uses custom guide name`: `guide: "labels.md"` と `labels.md` を置く → `guidePath` が `labels.md` で終わる
- `throws on broken extension`: 次の各ケースで `assert.throws(() => findExtension(root), ExtensionError)`
  - `config.json` がない（ディレクトリだけ作る）
  - JSON が不正（`"{"`）
  - トップレベルが `null`、`[]`（それぞれ `config.json` の中身として書く）
  - `subjectPrefix: 1`、`subjectPrefix: ""`、`guide: 123`
  - `.claude/commit` が通常のファイル
  - `subjectPrefix` がない、`prefixError` がない、`example` がない（それぞれ）
  - `subjectPrefix: "(["`（不正な正規表現）
  - 接頭辞ガイドがない（`guide: false`）

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/extension.test.mjs`
Expected: FAIL（`extension.mjs` が存在しないためモジュール解決エラー）

- [ ] **Step 3: `findExtension(cwd)` と `ExtensionError` を `scripts/lib/extension.mjs` に実装する**

`spawnSync("git", ["-C", cwd, "rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"])` で 2 行を得る。メインのルートは、common dir の basename が `.git` ならその親、それ以外（bare など）は候補にしない。候補を重複除去し、`.claude/commit` が存在する（種類を問わない）最初の候補を読み込む。ディレクトリでなければ `ExtensionError`（次の候補へ回り込まない）。

- [ ] **Step 4: テストを実行して合格を確認する**

Run: `node --test claude/.claude/skills/commit/test/extension.test.mjs`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

`git add` で上記 2 ファイルを個別にステージし、commit-procedure.md の手順でコミットする（例: `feat: commit スキルにリポジトリ別拡張の発見と読み込みを追加`）。

### Task 2: checkMessage の接頭辞差し替え

**Files:**
- Modify: `claude/.claude/skills/commit/scripts/lib/commit-message.mjs`（`checkMessage` の subject 判定）
- Test: `claude/.claude/skills/commit/test/check-commit-message.test.mjs`

**Interfaces:**
- Consumes: Task 1 の `Extension["prefix"]` の形（`{ re, error, example }`）
- Produces: `checkMessage(raw: string, options?: { prefix?: { re: RegExp, error: string, example: string } })`。戻り値の形は今と同じ。`options.prefix` がなければ今と同じ判定

- [ ] **Step 1: テストを書く**

`const PREFIX = { re: /^(?:(\[[^\[\]]+\])+ )/u, error: "接頭辞 [ラベル] がありません", example: "[設定画面] 保存ボタンを修正" }` を使う。

- `prefix: passes a labeled subject`: `"[設定画面][モバイル] 保存ボタンを修正 #12\n\n- 本文"` → `errors` が空
- `prefix: rejects a typed subject`: `"feat: 追加\n\n- 本文"` → エラーが 1 件以上、`msg` が `PREFIX.error` と `(例: [設定画面] 保存ボタンを修正)` を含む、`コミット種別プレフィックス` を含むエラーはない
- `prefix: title length excludes prefix`: `"[設定画面] " + "あ".repeat(50)` → タイトル長エラーなし。`"あ".repeat(51)` → `51 文字` を含むエラー
- `prefix: empty title after prefix`: `"[設定画面] "` → `タイトルが空です`
- `prefix: empty match is treated as missing`: `re: /^(?:(\[[^\]]+\])*)/u` で `"修正"` → `PREFIX.error` を含むエラー
- `prefix: leading space is rejected`: `" [設定画面] 修正"` → `PREFIX.error` を含むエラー
- `prefix: body rules stay common`: subject は `"[設定画面] 修正"`、本文に 81 桁の行 → `errors.length === 1` で、その `msg` が `表示幅が 80 桁を超えています` を含む（接頭辞系のエラーがないことを固定する。実装前は種別プレフィックスのエラーも出るため失敗する）

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: FAIL（`prefix:` で始まるテストが失敗し、既存テストは合格）

- [ ] **Step 3: `checkMessage` に `options.prefix` を実装する**

接頭辞の判定は `const m = re.exec(subject.text)` で、`m` がないか `m[0] === ""` なら `${error} (例: ${example})` のエラーを足す。タイトルは `m[0]` の長さ分を先頭から除き、さらに `ISSUE_SUFFIX_RE` を除いた残り。`m` がない（不一致）場合のタイトルは、今の経路と同じく subject 全体から `ISSUE_SUFFIX_RE` だけを除いたもの。`options.prefix` がなければ今のコードの経路をそのまま通す。

- [ ] **Step 4: テストを実行して合格を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

例: `feat: commit スキルの検証で接頭辞の定義を差し替え可能にする`

### Task 3: CLI での拡張の利用と `--show-rules`

**Files:**
- Modify: `claude/.claude/skills/commit/scripts/check-commit-message.mjs`
- Test: `claude/.claude/skills/commit/test/check-commit-message.test.mjs`（CLI 節）

**Interfaces:**
- Consumes: Task 1 の `findExtension`・`ExtensionError`、Task 2 の `checkMessage(raw, { prefix })`
- Produces（Task 4 の手順書が使う出力）:
  - `--show-rules`: 拡張なし → stdout に `規約: 共通規約` の 1 行、終了コード 0。拡張あり → stdout に `規約: 拡張 <dir>` と `接頭辞ガイド: <guidePath>` の 2 行、終了コード 0。メッセージの入力は読まない
  - 通常実行: `process.cwd()` から `findExtension` し、拡張があればその `prefix` で判定する。出力と終了コードは今と同じ
  - `ExtensionError` の場合は、`--show-rules` でも通常実行でも stderr に `拡張の設定を読み込めませんでした: <message>` を出して終了コード 2

- [ ] **Step 1: テストを書く**

既存の `run(args, input)` を `run(args, input, cwd = <git でない一時ディレクトリ>)` に変え、`spawnSync` に `cwd` を渡す（既存 CLI テストがこのリポジトリの状態に左右されないようにするため）。Task 1 と同じ `makeRepo`・`writeExt` 相当のヘルパーをこのファイルにも置く（テスト間で共有するヘルパーモジュールは作らない）。

- `cli: show-rules without extension`: git でない一時ディレクトリで `--show-rules` → 終了コード 0、stdout が `規約: 共通規約\n`
- `cli: show-rules with extension`: `writeExt` したリポジトリで `--show-rules` → 終了コード 0、stdout に `規約: 拡張 ` と `接頭辞ガイド: ` と `prefix-guide.md` を含む
- `cli: uses extension prefix`: 拡張ありのリポジトリで `"feat: 追加\n\n- 本文\n"` → 終了コード 1、stderr に `prefixError` を含む。`"[設定画面] 保存ボタンを修正\n\n- 本文\n"` → 終了コード 0
- `cli: broken extension exits 2`: `.claude/commit/` だけ作ったリポジトリで、`--show-rules` と通常実行の両方 → 終了コード 2、stderr に `拡張の設定を読み込めませんでした` を含む

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: FAIL（新しい `cli:` テストが失敗し、既存テストは合格）

- [ ] **Step 3: CLI を実装する**

`--show-rules` の分岐は `readInput` より前に置き、メッセージの入力を読まない。`--verbose` と同時に指定された場合、`--verbose` は無視する。先頭コメントの「使い方」に `--show-rules` を追記し、終了コードの説明を「2 = 入力または拡張の設定を読めない」に直す。

- [ ] **Step 4: テストを実行して合格を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs claude/.claude/skills/commit/test/extension.test.mjs`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

例: `feat: commit スキルの検証ツールでリポジトリ別拡張を使う`

### Task 4: 手順書と規約の更新

**Files:**
- Modify: `claude/.claude/skills/commit/references/commit-procedure.md`
- Modify: `claude/.claude/skills/commit/references/commit-rules.md`（テンプレート節、「コミット種別」節の冒頭、強調記号の項目、サンプル）

**Interfaces:**
- Consumes: Task 3 の `--show-rules` の出力と終了コード

- [ ] **Step 1: commit-procedure.md を更新する**

次を入れる（文言は敬体・規範表現で、構成は既存の手順番号を保つ）。
- 手順 1 の並列コマンドに `node [SKILL_DIR]/scripts/check-commit-message.mjs --show-rules` を加える。リポジトリ内で実行すること（検証ツールは作業ディレクトリから拡張を探すため、ステップ 5 の機械チェックも同じリポジトリ内で実行する）
  - 終了コード 2 なら作業を止め、エラー内容をサマリとして返す
  - `規約: 拡張 …` なら、ステップ 4 で `接頭辞ガイド:` のファイルを読む
- 手順 4: 拡張があるときは、commit-rules.md の「コミット種別」節の代わりに接頭辞ガイドに従い、subject は `<接頭辞><タイトル> <Issue番号>` 形式にする。それ以外の節は commit-rules.md に従う。接頭辞（ラベル）を決められない場合（呼び出し元の指定が必要なのにないなど）は、自己判断でコミットしてはいけない。候補を挙げてサマリとして返し、止まる
- 「機械チェックで検証できないルール」節: 種別プレフィックスの判定は、拡張があれば拡張の接頭辞で行うことを 1 文で補う
- 「呼び出し元へ返すサマリ」節: 先頭に「使った規約（`--show-rules` の 1 行目をそのまま）」を加える

- [ ] **Step 2: commit-rules.md を更新する**

- 「コミット種別」節の冒頭に 1 項目を加える: リポジトリに拡張（`.claude/commit/`）がある場合は、この節の代わりにその接頭辞ガイドに従う。拡張の有無は手順書の `--show-rules` で確認する。拡張の `subjectPrefix` は `u` フラグ付きの正規表現として解釈され、subject の先頭で判定される（不要なエスケープは設定エラーになる）
- テンプレート節に注記を 1 行加える: 拡張がある場合、1 行目は `<接頭辞><コミットタイトル> <Issue番号>` になる
- 「強調記号（`【】`, `[]`等）の使用は禁止」の項目に、拡張の接頭辞として subject に付ける `[...]` はこの禁止の対象外であることを明記する
- サンプルの `@u-motion/component`（2 か所）を架空のパッケージ名 `@example/ui` に置き換える（共通スキルに u-motion-front の名前を残さないため）

- [ ] **Step 3: 動作を確認する**

Run:
```bash
cd claude/.claude/skills/commit && node --test test/check-commit-message.test.mjs test/extension.test.mjs
grep -n -e 'show-rules' -e '接頭辞ガイド' references/commit-procedure.md references/commit-rules.md
grep -rn -e 'u-motion' -e '個体詳細' scripts references SKILL.md
```
Expected: テストは全件 PASS。1 つ目の grep は両ファイルでヒットする。2 つ目の grep は何も出力しない（終了コード 1）

- [ ] **Step 4: コミット**

例: `docs: commit スキルの手順書にリポジトリ別拡張の読み方を追加`
