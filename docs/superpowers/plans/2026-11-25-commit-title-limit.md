# commit スキルのタイトル文字数制限の緩和 Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** タイトル 50 文字を「注意だけの目安」に変え、subject の 1 行全体 72 文字を機械チェックの上限にする。

**Architecture:** `checkMessage` の戻り値に `warnings` を足し、目安超過はそこへ、上限超過は `errors` へ入れる。CLI は合否と終了コードを今のまま `errors` だけで決め、`warnings` を stderr に出す。

**Tech Stack:** Node.js 24（標準ライブラリのみ、`node:test`）、Markdown

**Spec:** `docs/superpowers/specs/2026-11-25-commit-title-limit-design.md`

## Global Constraints

- 目安: タイトル（接頭辞と末尾の Issue 番号 `\s+#\d+\s*$` を除く）50 コードポイント。超過は `warnings`、終了コードに影響しない
- 上限: subject の行全体（`subject.text` そのまま）72 コードポイント。超過は `errors`
- 拡張の接頭辞（`options.prefix`）がある場合も同じ判定
- 検証ツールは Node 標準ライブラリのみ。テストはファイルパスを指定して実行する
- 文書は敬体・規範表現。コミットは `references/commit-procedure.md` の手順で行う（`git commit -F`、Co-Authored-By を付けない）

## 決めたこと

- 定数: `MAX_TITLE_CHARS` を廃止し、`TITLE_GUIDE_CHARS = 50` と `MAX_SUBJECT_CHARS = 72` を export する
- `checkMessage` の戻り値: `{ empty, errors, warnings, lines }`。`warnings` は `errors` と同じ形（`{ n, width, msg }`）。`empty` のときは `warnings: []`
- 文言:
  - 注意: `タイトルが目安の 50 文字を超えています (N 文字)。意味を損なわずに短くできるなら短くしてください`
  - 違反: `subject が 72 文字を超えています (N 文字)`
- CLI: 合格時は stdout の `OK: …` の後に、違反時はエラー一覧の後に、`注意が N 件あります:` と `  行<n>: <msg>` を stderr に出す。注意だけなら終了コード 0
- タイトルが空のときは目安の判定をしない（今の `else if` の構造を保つ）

## Review Focus

1. 接頭辞 + タイトルで 72 文字ちょうど → 合格、73 文字 → 不合格（Task 1 でテスト）
2. タイトル 51 文字だが subject 全体は 72 文字以内 → 合格かつ注意 1 件（Task 1 でテスト）
3. 注意だけのメッセージで CLI の終了コードが 0 のまま（Task 1 でテスト）
4. Issue 番号が上限の 72 文字に含まれる（Task 1 でテスト）

---

### Task 1: 目安と上限の判定

**Files:**
- Modify: `claude/.claude/skills/commit/scripts/lib/commit-message.mjs`
- Modify: `claude/.claude/skills/commit/scripts/check-commit-message.mjs`
- Test: `claude/.claude/skills/commit/test/check-commit-message.test.mjs`

- [ ] **Step 1: テストを更新・追加する**

- 既存の `title over 50 code points` フィクスチャ（violations 表）を削除し、次を追加する
- `title over guide warns but passes`: `"feat: " + "あ".repeat(51) + "\n"` → `errors` が空、`warnings.length === 1`、`warnings[0].msg` が `目安の 50 文字` と `51 文字` を含む
- `title within guide has no warning`: `"feat: " + "あ".repeat(50)` → `assert.deepEqual(r.warnings, [])`
- `subject at 72 passes, 73 fails`: `"feat: " + "あ".repeat(66)`（72）→ `assert.deepEqual(r.errors, [])`（注意は 1 件出る）。`"あ".repeat(67)`（73）→ `subject が 72 文字を超えています (73 文字)` のエラー
- `issue number counts toward subject limit`: `"feat: " + "あ".repeat(61) + " #1234"`（73）→ 上限のエラー。タイトルは 61 文字なので注意も 1 件
- `empty message has no warnings`: `checkMessage("")` → `assert.deepEqual(r.warnings, [])`
- 既存の `prefix: title length excludes prefix` を書き換える: `"[設定画面] " + "あ".repeat(51)` → `errors` が空で注意 1 件。`"[設定画面] " + "あ".repeat(66)`（73）→ 上限のエラー
- `cli: warning only exits 0`: `"feat: " + "あ".repeat(51) + "\n\n- 本文\n"` → 終了コード 0、stdout が `OK: ` で始まり、stderr に `注意が 1 件あります:` を含む
- `cli: errors and warnings`: `"feat: " + "あ".repeat(51) + "\n- 本文\n"`（空行なし）→ 終了コード 1、stderr で `規約違反が` の後に `注意が 1 件あります:` が出る（`indexOf` で順序を比べる）

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs`
Expected: FAIL（追加・書き換えたテストが失敗し、それ以外は合格）

- [ ] **Step 3: 実装する**

`commit-message.mjs` の先頭コメントと `checkMessage` の戻り値の説明に `warnings` を足す。上限のチェックは、タイトルの空・目安のチェックとは独立した `if` にする。`check-commit-message.mjs` は `warnings` を出力し、先頭の「終了コード」のコメントに「注意は終了コードに影響せず stderr に出す」と足す。

- [ ] **Step 4: テストを実行して合格を確認する**

Run: `node --test claude/.claude/skills/commit/test/check-commit-message.test.mjs claude/.claude/skills/commit/test/extension.test.mjs`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

例: `feat: commit スキルのタイトル長を目安にし subject 全体に上限を設ける`

### Task 2: 規約と手順書の更新

**Files:**
- Modify: `claude/.claude/skills/commit/references/commit-rules.md`（「コミットタイトル」節）
- Modify: `claude/.claude/skills/commit/references/commit-procedure.md`（手順 4・5、「機械チェックで検証できないルール」節）

- [ ] **Step 1: commit-rules.md を更新する**

「50文字以内で簡潔に記述してください。[機械]」を次の 2 項目に置き換える。
- タイトル（種別・接頭辞と Issue 番号を除く）は 50 文字を目安に簡潔に記述してください。超えると機械チェックが注意を出しますが、意味を損なう場合は超えてもかまいません。[機械]
- subject の 1 行全体（種別・接頭辞と Issue 番号を含む）は 72 文字以内にしてください。GitHub で 72 文字を超える 1 行目が省略して表示されることがあるためです。[機械]

- [ ] **Step 2: commit-procedure.md を更新する**

- 手順 4 の「タイトルは空にせず、50 文字以内にします。」を「タイトルは空にせず、50 文字を目安にします。subject の 1 行全体は 72 文字以内にします。」に変える
- 手順 5 に 1 文を足す: 「注意」はエラーではなく、終了コードは 0 のままです。意味を損なわずに短くできるなら短くし、できなければそのままコミットしてかまいません
- 「機械チェックで検証できないルール」節の「タイトル長」を「タイトル長の目安と subject の上限」に変える

- [ ] **Step 3: 動作を確認する**

Run:
```bash
cd claude/.claude/skills/commit && node --test test/check-commit-message.test.mjs test/extension.test.mjs
grep -rn -e '50 文字以内' -e '50文字以内' references
```
Expected: テストは全件 PASS。grep は何も出力しない（終了コード 1）

- [ ] **Step 4: コミット**

例: `docs: commit スキルの規約をタイトル長の目安と subject の上限へ変更`
