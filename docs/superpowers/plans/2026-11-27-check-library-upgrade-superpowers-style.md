# check-library-upgrade スキルの superpowers 形式への更新 Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** `claude/.claude/skills/check-library-upgrade/SKILL.md` を、置き場所と動作は変えずに `plugins/superpowers/` のスキルと同じ書き方へそろえ、将来プラグインへ移せる状態にする。

**Architecture:** 変更するのは SKILL.md 1 ファイルだけ。frontmatter から Claude Code 独自・実験的なフィールドを外し、引数の受け取り方とツール名をハーネスに依存しない書き方にし、文体と見出しを superpowers にそろえる。動作が変わっていないことは、書き換えの前後で同じシナリオを subagent に実行させて確かめる。

**Tech Stack:** Markdown、npm（フィクスチャ用）

**Spec:** 本計画書の「背景」節（2026-11-27 の会話での提案のうち「今回やる変更」1〜6 と、ユーザーの決定）

## 背景

- ユーザーは check-library-upgrade スキルを後で `plugins/superpowers` へ統合したい。今回はその準備だけを行う（commit スキルの前例 `docs/superpowers/plans/2026-11-25-commit-skill-superpowers-style.md` と同じ進め方）
- **ユーザー決定**: description は案 A（いつ使うかだけ）、引数は「依頼から読み取る」に一本化、任意項目（subagent へのディスパッチ、危険信号の表、npm 以外への対応）は入れない
- **対象外**: `plugins/superpowers/skills/` への移動、`check-translation.py`・UPSTREAM.md・README・`skills-guide.md`・CLAUDE.md・3 つの JSON の `version` などプラグイン側の付随更新、`~/.claude/skills/check-library-upgrade`（このマシンではリポジトリへのリンクではなく実ディレクトリ）の扱い
- 調べた事実（2026-11-27、https://code.claude.com/docs/en/skills と https://agentskills.io/specification）:
  - `allowed-tools` は起動したターンの間だけ確認なしで使える許可を足すもので、制限ではない。Agent Skills 仕様では Experimental
  - `argument-hint` は Claude Code 独自で、Agent Skills 仕様にない
  - `$N` は 0 始まり（`$0` が 1 番目の引数）。引数なしでモデルが自分の判断で呼んだときの `$ARGUMENTS` の展開は文書化されていない。引数を渡したのに本文にプレースホルダがなければ、末尾に `ARGUMENTS: <入力>` が追記される
- シナリオに使う範囲の一次情報（2026-11-27 に確認）:
  - React（https://raw.githubusercontent.com/facebook/react/main/CHANGELOG.md）: 18.3.0 は「identical to 18.2 but adds warnings for deprecated APIs」で、`defaultProps` for function components と `act` from `test-utils` の警告を含む。18.3.1 は「Export `act` from `react`」
  - ms（GitHub Release `2.1.3`）: Patches のみ（zeit から vercel への改名、eslint の更新、prettier の追加、GitHub Actions CI）。`npm view ms dist-tags` は `latest` = `2.1.3` で、`versions` の末尾は `4.0.0-nightly.202508271359`

## Global Constraints

- 作業は master ではなく新しいブランチで行う
- スキルの置き場所は `claude/.claude/skills/check-library-upgrade/SKILL.md` のまま。frontmatter の `name` は `check-library-upgrade`
- frontmatter は `name` と `description` の 2 つだけにする。`description` は次の文言にする（一字一句この通り）:

  ```
  description: 依存ライブラリを特定のバージョン（または最新版）へ更新する前に、リリースノート・破壊的変更・プロジェクトへの影響を調べるよう頼まれたときに使います
  ```

- **動作を変えない。** 次は意味を変えずに残す: 「なし」最小記法ルール（全セクション共通、補足は末尾の総括の一文のみ）、セクション 2 に載せてよいのは追加機能だけ、deprecation は旧 API が動く限りセクション 3 に含めない、依存に無いときは確認を提示した時点で停止し意図を仮定しない、一次情報の裁定（一致する二次情報のみ採用・食い違えば一次優先・一次情報が取得できなければ二次情報を「未確認」と注記して扱う）、最新安定版は `npm view <library> dist-tags` の `latest`（プレリリースタグと `versions` 配列の末尾は使わない）、現在バージョン（排他）〜ターゲット（包含）、範囲表記と確定バージョンが異なれば確定バージョン、各変更に導入バージョンと出典、全区間の累積、確認できなければ推測で埋めない、重大な影響があれば総括の一文
- **出力するレポートの書式は変えない。** 4 つのセクション見出し・タイトル行・「対象リリース:」の行は現行のまま（常体・体言止め）。変えるのは指示文の書き方だけ
- 文体は `plugins/superpowers/UPSTREAM.md` の「翻訳方針」（敬体、規範語の強さの表）と「用語集」に従う。「効く」系の表現（効く・効か・効い・効け）を使わない
- ツール名（`Glob` `Grep` `WebFetch` `WebSearch` `mcp__*`）を書かない。何をするかで書く。`npm view` `npm ls` などのコマンドとパス・URL はそのまま残す
- `$ARGUMENTS` `$1` `$2` を書かない。ライブラリ名とターゲットバージョンはユーザーの依頼から読み取る
- 各タスクのコミットは commit スキルで行う。push はしない

## Review Focus

- **非推奨 API を使っているコードを「影響あり」にする**: deprecation しか無い範囲で、プロジェクトが非推奨 API を使っていても、セクション 3・4 は `なし` のままであるべき。S2 で固定する
- **バグ修正・保守の変更を追加機能に数える**: パッチしか無い範囲では、セクション 1・2 は `なし` であるべき（テンプレートの括弧書きをフェンスの外へ移すときに落ちやすい規則）。S3 で固定する
- **依存に無いライブラリを調べ続ける**: 対象が依存に無いときは確認を提示して止まり、リリースノートの収集に進まないべき。S1 で固定する
- **バージョン省略時にプレリリースや `versions` の末尾を選ぶ**: `latest` を採用すべき。S3（ms は `versions` の末尾が nightly）で固定する
- **引数だけの依頼を読み取れない**: `$ARGUMENTS` をやめた後も、`react 18.3.1` のような引数だけの依頼からライブラリ名とバージョンを読み取るべき。S2 の依頼文をこの形にして固定する
- **残るリスク（今回は検証しない）**: Skill ツールに実際に引数を渡して起動したときの読み取りは、S2 で依頼文として与えて模擬するだけ。インストール済みのコピーを更新しないため、Skill 経由では試験できない

---

### Task 1: シナリオの用意と現行版のベースライン記録

**Files:**
- Create: `docs/superpowers/specs/2026-11-27-check-library-upgrade-tests.md`（テスト記録。構成は `docs/superpowers/specs/2026-11-22-tidying-skill-tests.md` にならう: フィクスチャ / シナリオ / 結果）

**Interfaces:**
- Produces: 実行者のセッションの scratchpad（以下 `$SCRATCH`）に次を作る。リポジトリには入れない。Task 2 の実行時に無くなっていれば、テスト記録の「フィクスチャ」の記述から作り直す
  - `$SCRATCH/old-SKILL.md`: Task 2 の前の版。作り直すときは `git show master:claude/.claude/skills/check-library-upgrade/SKILL.md` から取る
  - `$SCRATCH/fixtures/s1/`, `s2/`, `s3/`: 下のフィクスチャ
- Produces: シナリオの実行方法（Task 2 も同じ方法を使う）: シナリオ 1 回につき `general-purpose` の subagent を 1 つディスパッチする。プロンプトは次の文 + 改行 + 依頼文:

  ```
  `<SKILL>` を読み、ユーザーから次の依頼を受けてこのスキルが起動されたものとして従ってください。
  この作業では Skill ツールを使ってはいけません（同名のスキルがインストールされていますが、従うのはこのファイルだけです）。
  作業ディレクトリは `<DIR>` です。`<DIR>` の外は変更しないでください。
  最後に、レポートの全文と、Skill ツールを使ったかどうかを返してください。
  ```

  `<SKILL>` は SKILL.md の絶対パス、`<DIR>` はフィクスチャの新しいコピー先。Skill ツールを使った実行は無効として数えず、やり直す

- [ ] **Step 1: フィクスチャを作る**

各フィクスチャは `package.json` を手で書き、`npm install --ignore-scripts` で `node_modules` と `package-lock.json` を作る。

- `s1/`: `dependencies` に `"react": "18.2.0"` だけ。`src/index.js` は `import React from "react";` の 1 行
- `s2/`: `dependencies` に `"react": "18.2.0"` と `"react-dom": "18.2.0"`
  - `src/Button.jsx`: 関数コンポーネント `Button` と `Button.defaultProps = { label: "OK" };`
  - `src/Button.test.jsx`: `import { act } from "react-dom/test-utils";` を使って `Button` を描画するテスト（実行はしない。使用箇所として置くだけ）
- `s3/`: `dependencies` に `"ms": "2.1.2"`。`src/duration.js` に `import ms from "ms"; export const timeout = ms("2 days");`

Run: `for d in s1 s2 s3; do (cd $SCRATCH/fixtures/$d && npm ls --depth=0); done`
Expected: s1 は `react@18.2.0`、s2 は `react@18.2.0` と `react-dom@18.2.0`、s3 は `ms@2.1.2`

- [ ] **Step 2: テスト記録にフィクスチャとシナリオを書く**

判定は返ってきたレポートを手で読んで行う。全シナリオ共通の合格条件: レポートに `- <項目>` がそのまま残っていない、4 セクションの見出しとタイトル行が現行の書式どおり（S1 はレポートを出さないので対象外）。

| ID | フィクスチャ | 依頼文 | 合格の条件 |
|---|---|---|---|
| S1 | s1 | `zod を 4.6.7 に上げる前に、更新内容を調べてください` | 依存に無いと報告し、新規導入か名前の誤りかを尋ねて止まる。`npm view zod versions` 以降の手順（リリースノートの取得）に進まない |
| S2 | s2 | `react 18.3.1` | 現在 18.2.0・ターゲット 18.3.1 と読み取る。セクション 1 に「`act` を `react` から export」（18.3.1）が載る。セクション 2 に同項目が `src/Button.test.jsx` の使用箇所を添えて載る。セクション 3・4 の本文が `なし` の一語だけ（`defaultProps` などの非推奨化の警告が載らない） |
| S3 | s3 | `ms を最新版に上げたいので、事前に影響を調べてください` | ターゲットに実行時点の `npm view ms dist-tags.latest`（2026-11-27 時点で `2.1.3`）を採用する（`beta` `canary` `nightly` や `versions` の末尾を選ばない）。4 セクションすべての本文が `なし` の一語だけ（改名・依存更新・CI の変更を追加機能に数えない） |

- [ ] **Step 3: 現行版で S1〜S3 を実行して記録する**

`<SKILL>` = `$SCRATCH/old-SKILL.md`。S1 は 3 回、S2・S3 は 1 回ずつ実行する。各結果の要点（合否、根拠となる出力の抜粋、Skill ツールを使わなかったこと）をテスト記録の「結果（現行版）」に書く。

Expected: すべて合格。不合格があれば、そのまま記録して先へ進む（今回は動作を変えないため現行版の失敗は直さない。Task 2 で新版がそれより悪くなっていないことを確かめ、最後にユーザーへ報告する）

- [ ] **Step 4: コミットする**

テスト記録だけをコミットする。

### Task 2: SKILL.md の書き直しと動作の確認

**Files:**
- Modify: `claude/.claude/skills/check-library-upgrade/SKILL.md`
- Modify: `docs/superpowers/specs/2026-11-27-check-library-upgrade-tests.md`（「結果（新版）」を追記）

**Interfaces:**
- Consumes: Task 1 の `$SCRATCH/old-SKILL.md`、フィクスチャ、シナリオの実行方法、合格の条件

- [ ] **Step 1: SKILL.md を書き直す**

節ごとに次のようにする。ここに書いていない文は、敬体にする以外は意味を変えない。

- frontmatter: Global Constraints の 2 フィールドだけにする
- `# ライブラリ更新内容の調査` の直下に `## 概要` を置く。現行の冒頭の 1 文を敬体にし、続けて **基本原則:** として「調査の起点は、現在プロジェクトで使用中のバージョンです。変更は一次情報（GitHub Release・CHANGELOG）を根拠にします。」を置く
- `## 使うとき`: トリガーだけを書く（tidying の `## 使うとき` と同じ粒度）
  - 依存ライブラリを特定のバージョン、または最新版へ更新する前の事前調査を頼まれたとき
  - 依存の更新・アップグレードの前に、互換性や破壊的変更を確かめたいとき
- `## 手順`: 冒頭（`### 1.` の前）に `### 0. 対象を読み取る` を置き、現行の `## 引数` の内容をここへ移す
  - ユーザーの依頼からライブラリ名（npm パッケージ名。例: `react`, `@tanstack/react-router`）とターゲットバージョン（例: `19.2.0`, `1.180.0`）を読み取ります。`react 19.2.0` のように 2 語だけ渡された場合は、1 語目をライブラリ名、2 語目をターゲットバージョンとして扱います
  - ターゲットバージョンが無ければ最新安定版を対象にします（現行の `dist-tags` / `latest` / プレリリースタグの列挙 / `versions` 配列末尾を使わない理由の文を、そのまま敬体で残す）
  - ライブラリ名が読み取れなければ、何を調査すればよいかユーザーに尋ねてから進めます
- `### 1.`〜`### 5.`: 番号・見出し・順序・中の手順の番号を保つ
  - ツール名を Global Constraints に従って言い換える。例: 「`Glob` で `**/package.json` を検索し」→「`**/package.json` に一致するファイルを探し」、「`WebFetch` で `<URL>` を取得」→「`<URL>` を取得」、「`Grep` でプロジェクト全体…から検索する」→「プロジェクト全体…を検索します」、一次情報の段落の「`WebSearch` や要約を介した `WebFetch` の結果」→「Web 検索の結果や、要約を介して取得したページ」、「`mcp__context7__*` や GitHub の MCP ツール」→「ライブラリのドキュメントや GitHub を参照する MCP ツール」
  - 手順 1-4 の禁止は「〜してはいけません」にする（UPSTREAM.md の規範語の表）
- 手順 5 のテンプレート:
  - コードフェンスの中は次の形にする（見出しの行は現行と同じ。括弧書きの指示は外す）

    ```
    ## <library> の更新調査: <現在バージョン> → <ターゲットバージョン>

    対象リリース: <跨ぐバージョンの一覧 / メジャー跨ぎの有無>

    ### 1. 主な追加機能
    - <項目>

    ### 2. 現在のプロジェクトに有用な追加機能
    - <項目>

    ### 3. 破壊的変更
    - <項目>

    ### 4. 現在のプロジェクトに影響がある破壊的変更
    - <項目>
    ```

  - フェンスの直後に `**各セクションに書くもの:**` として 1〜4 の番号付きリストを置き、現行のフェンス内の括弧書きと箇条書きの指示をすべて、各セクションの番号の下へ敬体で移す。条件・否定・括弧内の列挙を落とさない。セクション 2〜4 にある「該当が無ければ『なし』とだけ書き、理由や補足説明は一切添えない」も各セクションに残す（フェンスの前の「なし」最小記法ルールと重複しても削らない）
  - 「なし」最小記法ルールと、最後の総括の一文の指示は現行の位置と意味のまま敬体にする
- `## よくある間違い`（現行の `## 注意` を置き換える）: 現行の 5 項目を同じ順序で、誤りと正しいやり方が分かる敬体の文にする（例:「最新版同士の差分を調べてしまう → 起点は現在使用中のバージョンです」）

- [ ] **Step 2: 静的に確認する**

Run: `grep -nE 'Glob|Grep|WebFetch|WebSearch|mcp__|allowed-tools|argument-hint|\$ARGUMENTS|\$[0-9]|効く|効か|効い|効け' claude/.claude/skills/check-library-upgrade/SKILL.md`
Expected: 出力なし

Run: `sed -n 1,4p claude/.claude/skills/check-library-upgrade/SKILL.md`
Expected: `---`、`name: check-library-upgrade`、Global Constraints の `description:` 行、`---` の 4 行

Run（残すべき語が消えていないこと）:
`F=claude/.claude/skills/check-library-upgrade/SKILL.md; for s in 'dist-tags' 'latest' 'canary' 'experimental' 'npm ls <library> --depth=0' 'repository.directory' 'versions --json' 'raw.githubusercontent.com' 'pkg@1.2.3' '### 1. 主な追加機能' '### 2. 現在のプロジェクトに有用な追加機能' '### 3. 破壊的変更' '### 4. 現在のプロジェクトに影響がある破壊的変更' '対象リリース:' '未確認'; do grep -qF -- "$s" $F || echo "MISSING: $s"; done`
Expected: 出力なし

- [ ] **Step 3: 現行版と並べて読み比べる**

`diff <(sed 's/。/。\n/g' $SCRATCH/old-SKILL.md) <(sed 's/。/。\n/g' claude/.claude/skills/check-library-upgrade/SKILL.md)` で並べ、Global Constraints の「動作を変えない」の各項目について、条件（if / only / unless）・否定・列挙の項目数が保たれていることを 1 項目ずつ確かめる。落ちていれば Step 1 に戻って直す。

- [ ] **Step 4: 新版で S1〜S3 を実行して記録する**

`<SKILL>` = `claude/.claude/skills/check-library-upgrade/SKILL.md` の絶対パス。Task 1 と同じ依頼文・同じ方法・同じ回数（S1 は 3 回、S2・S3 は 1 回）で実行し、テスト記録の「結果（新版）」に書く。

現行版と新版で合否が食い違ったシナリオは、文言を直す前に、そのシナリオを現行版・新版それぞれでさらに 2 回ずつ実行し、ばらつきか回帰かを見分けて記録する。

Expected: Task 1 で合格したシナリオは新版でも合格。新版だけが繰り返し不合格になったら回帰として、原因の文言を Step 1 に戻って直し、そのシナリオを再実行する

- [ ] **Step 5: コミットする**

SKILL.md とテスト記録をコミットする。Task 1 の Step 3 で現行版の不合格があった場合は、完了の報告でその内容をユーザーに伝える（直すかどうかはユーザーが決める）。
