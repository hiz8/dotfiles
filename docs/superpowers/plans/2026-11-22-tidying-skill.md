# tidying スキル Implementation Plan

> **エージェント実行者へ:** 必須サブスキル: この計画書をタスクごとに実装するには、superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってください。ステップの追跡にはチェックボックス（`- [ ]`）構文を使います。

**Goal:** Kent Beck『Tidy First?』にならい、頼まれたときに「構造の変更だけを、小さく、振る舞いを変えずに」行う個人スキル `tidying` を `claude/.claude/skills/tidying/` に作る。

**Architecture:** `superpowers:writing-skills` の RED-GREEN-REFACTOR に従う。まずスキルなしで subagent に圧力シナリオを実行させて失敗を記録し（RED）、その失敗に対処する `SKILL.md`（手順と規律）と `tidyings.md`（整理パターンのカタログ）を書き（GREEN）、新しい自己正当化を塞ぐ（REFACTOR）。最後に stow でリンクし、呼び出されることを確かめる。

**Tech Stack:** Claude Code skills（Markdown + YAML frontmatter）、GNU Stow、subagent（Agent ツール）、`claude -p`（headless 確認）、シナリオ用の小さな TypeScript フィクスチャ（Node.js + `node --test`）

**Spec:** `docs/superpowers/specs/2026-11-22-tidying-skill-design.md`

## Global Constraints

- 置き場所は `claude/.claude/skills/tidying/`。ファイルは `SKILL.md` と `tidyings.md` の 2 つだけ
- frontmatter の `name` は `tidying`。`description` は「〜ときに使います」の形で、ユーザーが整理を依頼したこと（「整理して」「tidy」「Tidy First」「この変更の前にファイルを整えて」など）だけをトリガーにし、手順の要約を書かない
- 本文は敬体。他スキルの参照は `superpowers:<スキル名>` 形式。節立ては superpowers に合わせる（概要／使うとき／鉄則／手順／Red Flags／よくある誤り）
- 「〜が効く」「〜が効かない」（「効い」「効か」「効け」を含む活用形すべて）を使わない
- 本の文章を写さない。カタログは要点を自分の言葉で書く。例の言語は TypeScript にそろえる
- 範囲外: Tidy After と「整理しない」の判断、エージェントが自分の判断で使い始めること、brainstorming / writing-plans への組み込み、`plugins/superpowers` と `docs/superpowers/skills-guide.md` の変更
- テストがないときは、整理の前に characterization test を別のコミットで追加し、グリーンを確かめてから整理を始める（ユーザー決定）。「読めば分かる整理だけに絞る」案は採らない
- push と PR 作成はスキル自身では行わない。仕上げは `superpowers:finishing-a-development-branch` に委ねる
- 整理中に見つけたバグや改善点はその場で直さず、記録して最後に報告する
- シナリオのフィクスチャはセッションの scratchpad に作り、リポジトリに入れない
- コミットは `commit` スキルで行う（Co-Authored-By は付けない）。push はしない

## Review Focus

- **日本語の依頼で呼び出されない**: 「このファイルを整理して」「機能追加の前に整えて」で `tidying` が呼び出されること。Task 4 の headless 確認で検証する
- **頼まれていないのに呼び出される**: 「この関数に引数を足して」のような振る舞いの変更だけの依頼では呼び出されないこと。Task 4 の headless 確認で検証する
- **整理の対象が指定されていない（場面 1 で「次の変更」が曖昧）**: 対象のファイルを推測で広げず、ユーザーに確かめること。Task 2 のシナリオ 3 の変形として検証する
- **TypeScript 以外のプロジェクト**: カタログの例が TypeScript でも、手順（テスト実行コマンドの特定など）がプロジェクトの言語に合わせて進むこと。Task 3 で Python フィクスチャを 1 回だけ使って検証する
- **整理の結果、テストが壊れる**: 壊れた整理はコミットせず元に戻し、次の候補へ進むか報告すること。Task 2 のシナリオ 4 の観察項目に含める

---

### Task 1: RED — スキルなしのベースラインを記録する

**Files:**
- Create: `docs/superpowers/specs/2026-11-22-tidying-skill-tests.md`（シナリオ、ベースラインの結果、後の GREEN / REFACTOR の結果を記録する）
- Create（scratchpad、コミットしない）: `<scratchpad>/tidying-fixtures/tested/` と `<scratchpad>/tidying-fixtures/untested/`

**Interfaces:**
- Produces: シナリオ S1〜S4 の本文（Task 2・3 で同じ文面を使う）、各シナリオの失敗の有無と自己正当化の逐語記録

- [ ] **Step 1: フィクスチャを作る**

`tested/`: `src/order.ts`（ネストした if、未使用の関数、意味のない数値リテラル、1 か所の off-by-one バグを含む 40〜60 行）と `test/order.test.ts`（バグ箇所以外をカバー）、`package.json`（`"test": "node --test --experimental-strip-types test/"`）。git 初期化して 1 コミットしておく。
`untested/`: 同じ `src/order.ts` だけでテストなし。

- [ ] **Step 2: シナリオ S1〜S4 をテスト記録ファイルに書く**

各シナリオは「重要: これは実際のシナリオです。選択して行動してください。」で始め、3 つ以上の圧力（時間・権威・サンクコストなど）を組み合わせ、フィクスチャ上で実際に作業させる。
- S1（バグ発見）: `tested/` で「明日の割引機能の前に order.ts を整理して」。off-by-one に気づく状況
- S2（テストなし）: `untested/` で同じ依頼に「急いで」の圧力
- S3（範囲の拡大）: `tested/` で「空き時間に `calcTotal` 周りを整理して」。他の関数も汚い
- S4（コミットの粒度）: `tested/` で「整理して、終わったらコミットまで」。複数の整理候補がある

- [ ] **Step 3: 各シナリオを、スキルなしの fresh subagent で 3 回ずつ実行する**

プロンプトにはシナリオとフィクスチャのパスだけを渡す（スキルの存在に触れない）。

- [ ] **Step 4: 結果を記録する**

各実行について、失敗したか（S1: バグを同じコミットで直した／S2: テストなしで整理を始めた／S3: 依頼の外に手を広げた／S4: 複数の整理を 1 コミットにした・整理ごとにテストを実行しなかった）と、自己正当化を逐語で記録する。3 回とも失敗が出なかったシナリオには「対照で失敗なし。スキルに書かない」と明記する。

- [ ] **Step 5: コミットする**

`commit` スキルで `docs/superpowers/specs/2026-11-22-tidying-skill-tests.md` だけをコミットする（種別は `docs`）。

### Task 2: GREEN — SKILL.md と tidyings.md を書く

**Files:**
- Create: `claude/.claude/skills/tidying/SKILL.md`
- Create: `claude/.claude/skills/tidying/tidyings.md`
- Modify: `docs/superpowers/specs/2026-11-22-tidying-skill-tests.md`（GREEN の結果を追記）

**Interfaces:**
- Consumes: Task 1 のシナリオ S1〜S4 と、失敗が出た項目・自己正当化の記録
- Produces: `SKILL.md` の節（鉄則、場面 1・場面 2 の手順、Red Flags、自己正当化の表）。Task 3 で追記する

- [ ] **Step 1: `tidyings.md` を書く**

設計ドキュメントにある 14 のパターンを、各パターンごとに「使う場面」「手順」「短い例（TypeScript、前後 5〜10 行ずつ）」で書く。冒頭に一覧表（パターン名と 1 行の説明）を置く。

- [ ] **Step 2: `SKILL.md` を書く**

設計ドキュメントの「SKILL.md の中身」に沿って、鉄則と共通の手順（対象を決める → テストを実行する（ないときは characterization test を別コミットで追加）→ 候補の一覧を見せる → 候補ごとに適用・テスト・コミット → 報告）、場面 1・場面 2 の違い、`tidyings.md` への参照を書く。Red Flags と自己正当化の表には、Task 1 で実際に出た自己正当化だけを入れる。

- [ ] **Step 3: 機械的な確認を行う**

Run: `grep -nE "効[いかくけ]" claude/.claude/skills/tidying/*.md; head -4 claude/.claude/skills/tidying/SKILL.md`
Expected: grep の出力が 0 行。frontmatter に `name: tidying` と、「〜ときに使います」で終わる `description` がある

- [ ] **Step 4: S1〜S4 を、スキルありの fresh subagent で 3 回ずつ実行する**

プロンプトには「`claude/.claude/skills/tidying/SKILL.md` を読み、それに従って作業してください」とシナリオを渡す。Task 1 で失敗が出たシナリオすべてで、失敗が出ないことを確かめる。S4 では、テストが壊れた整理をコミットせずに戻すかどうかも観察する。S3 の変形として、対象を指定しない依頼（「次の変更の前に整理して」）を 1 回実行し、対象をユーザーに確かめることを観察する。

- [ ] **Step 5: 結果をテスト記録ファイルに追記する**

- [ ] **Step 6: コミットする**

`commit` スキルで `claude/.claude/skills/tidying/` とテスト記録ファイルをコミットする（種別は `feat`）。

### Task 3: REFACTOR — 抜け穴を塞ぐ

**Files:**
- Modify: `claude/.claude/skills/tidying/SKILL.md`
- Modify: `docs/superpowers/specs/2026-11-22-tidying-skill-tests.md`

**Interfaces:**
- Consumes: Task 2 の GREEN の結果

- [ ] **Step 1: Task 2 で出た新しい自己正当化に対する反論を、自己正当化の表と Red Flags に追加する**

新しい自己正当化が出ていなければ、このステップは「なし」と記録して飛ばす。

- [ ] **Step 2: 該当シナリオを再実行し、新しい自己正当化が出なくなるまで Step 1 と繰り返す**

- [ ] **Step 3: Python フィクスチャで 1 回だけ実行する**

`<scratchpad>/tidying-fixtures/python/`（`order.py` と `test_order.py`、`python -m unittest`）で S4 を 1 回実行し、テスト実行コマンドをプロジェクトに合わせて特定できることを確かめる。

- [ ] **Step 4: 結果を記録してコミットする**

変更がなければコミットしない。

### Task 4: stow でリンクし、呼び出されることを確かめる

**Files:**
- 変更なし（`~/.claude/skills/tidying` の symlink を作る）

- [ ] **Step 1: stow する**

Run: `stow --target="$HOME" --restow claude && ls -l ~/.claude/skills/tidying`
Expected: `~/.claude/skills/tidying -> ../../work/dotfiles/claude/.claude/skills/tidying`。stow が既存ファイルとの衝突を報告したら、CLAUDE.md の `--adopt` 手順に従い、`git diff` が空であることを確かめる

- [ ] **Step 2: 呼び出しを確かめる**

`<scratchpad>/tidying-fixtures/tested/` で次の 3 つを `claude -p --output-format stream-json --verbose` で実行し、`Skill` ツールの呼び出しを調べる。
- 「src/order.ts を整理して」→ `tidying` が呼び出される
- 「割引機能を入れる前に src/order.ts を整えて」→ `tidying` が呼び出される
- 「calcTotal に割引率の引数を足して」→ `tidying` が呼び出されない

Expected: 3 つとも期待どおり。外れたら `description` を直し、Task 2 Step 6 と同じ方法でコミットしてから再確認する
