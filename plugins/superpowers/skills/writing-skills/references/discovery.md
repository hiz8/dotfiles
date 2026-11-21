# 発見されやすい SKILL.md の書き方

superpowers:writing-skills の一部です。SKILL.md のテンプレートと、エージェントがスキルを見つけて読むように、スキルに名前を付け、説明し、サイズを決める方法を扱います。

## SKILL.md の構造

**frontmatter（YAML）:**
- 必須フィールドは 2 つ: `name` と `description`（サポートされるすべてのフィールドは [agentskills.io/specification](https://agentskills.io/specification) を参照）
- 合計で最大 1024 文字
- `name`: 英字・数字・ハイフンのみを使う（括弧や特殊文字は使わない）
- `description`: 三人称で、いつ使うかだけを書く（何をするかは書かない）
  - 「Use when...」で始めて、トリガーとなる条件に焦点を当てる
  - 具体的な症状、状況、コンテキストを含める
  - **スキルのプロセスやワークフローを決して要約しない**（理由は下の「スキル発見の最適化」を参照）
  - できれば 500 文字未満に収める

```markdown
---
name: Skill-Name-With-Hyphens
description: Use when [specific triggering conditions and symptoms]
---

# スキル名

## 概要
これは何か。基本原則を 1〜2 文で。

## 使うとき
[判断が自明でない場合は、小さなインラインのフローチャート]

症状とユースケースの箇条書き
使わないとき

## 基本パターン（技法・パターン向け）
変更前後のコード比較

## クイックリファレンス
よくある操作を流し読みするための表または箇条書き

## 実装
単純なパターンはインラインのコード
大きなリファレンスや再利用できるツールはファイルへのリンク

## よくある間違い
何がうまくいかないか + 修正方法

## 実際の影響（任意）
具体的な結果
```


## スキル発見の最適化（SDO）

**発見にとって最重要:** 将来のエージェントがあなたのスキルを**見つけられなければなりません**

### 1. 充実した description フィールド

**目的:** エージェントは description を読んで、あるタスクにどのスキルを読み込むかを決めます。「今このスキルを読むべきか?」に答えられるようにしてください。

**形式:** 「Use when...」で始めて、トリガーとなる条件に焦点を当てます

**最重要: description = いつ使うか。スキルが何をするかではない**

description に書くのはトリガーとなる条件**だけ**です。スキルのプロセスやワークフローを description に要約してはいけません。

**これが重要な理由:** テストの結果、description がスキルのワークフローを要約していると、エージェントがスキルの全文を読まずに description に従ってしまうことがありました。「タスクの合間にコードレビュー」という description のせいで、スキルのフローチャートには 2 回のレビュー（仕様準拠、次にコード品質）が明確に示されていたにもかかわらず、エージェントはレビューを**1 回**しか行いませんでした。

description を「Use when executing implementation plans with independent tasks」だけ（ワークフローの要約なし）に変えたところ、エージェントはフローチャートを正しく読み、2 段階のレビュープロセスに従いました。

**落とし穴:** ワークフローを要約した description は、エージェントが取る近道になります。スキル本文は、エージェントが読み飛ばすドキュメントになってしまいます。

```yaml
# ❌ BAD: Summarizes workflow - agents may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: Triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code
```

**内容:**
- このスキルが当てはまることを示す、具体的なトリガー、症状、状況を使う
- *言語固有の症状*（setTimeout、sleep）ではなく、*問題*（競合状態、一貫しない挙動）を書く
- スキル自体が特定の技術に固有でない限り、トリガーは技術に依存しない形にする
- スキルが特定の技術に固有なら、トリガーでそれを明示する
- 三人称で書く（システムプロンプトに注入されるため）
- **スキルのプロセスやワークフローを決して要約しない**

```yaml
# ❌ BAD: Too abstract, vague, doesn't include when to use
description: For async testing

# ❌ BAD: First person
description: I can help you with async tests when they're flaky

# ❌ BAD: Mentions technology but skill isn't specific to it
description: Use when tests use setTimeout/sleep and are flaky

# ✅ GOOD: Starts with "Use when", describes problem, no workflow
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently

# ✅ GOOD: Technology-specific skill with explicit trigger
description: Use when using React Router and handling authentication redirects
```

### 2. キーワードの網羅

エージェントが検索しそうな語を使います。
- エラーメッセージ: "Hook timed out"、"ENOTEMPTY"、"race condition"
- 症状: "flaky"、"hanging"、"zombie"、"pollution"
- 同義語: "timeout/hang/freeze"、"cleanup/teardown/afterEach"
- ツール: 実際のコマンド、ライブラリ名、ファイルの種類

### 3. わかりやすい命名

**能動態で、動詞から始めます:**
- ✅ `creating-skills`（`skill-creation` ではなく）
- ✅ `condition-based-waiting`（`async-test-helpers` ではなく）

### 4. トークン効率（最重要）

**問題:** getting-started や頻繁に参照されるスキルは、**すべての**会話に読み込まれます。1 トークンも無駄にできません。

**目標の語数:**
- getting-started のワークフロー: 各 150 語未満
- 頻繁に読み込まれるスキル: 合計 200 語未満
- その他のスキル: 500 語未満（それでも簡潔に）

**技法:**

**詳細はツールのヘルプに移す:**
```bash
# ❌ BAD: Document all flags in SKILL.md
search-conversations supports --text, --both, --after DATE, --before DATE, --limit N

# ✅ GOOD: Reference --help
search-conversations supports multiple modes and filters. Run --help for details.
```

**相互参照を使う:**
```markdown
# ❌ BAD: Repeat workflow details
When searching, dispatch subagent with template...
[20 lines of repeated instructions]

# ✅ GOOD: Reference other skill
Always use subagents (50-100x context savings). REQUIRED: Use [other-skill-name] for workflow.
```

**例を圧縮する:**
```markdown
# ❌ BAD: Verbose example (42 words)
your human partner: "How did we handle authentication errors in React Router before?"
You: I'll search past conversations for React Router authentication patterns.
[Dispatch subagent with search query: "React Router authentication error handling 401"]

# ✅ GOOD: Minimal example (20 words)
Partner: "How did we handle auth errors in React Router?"
You: Searching...
[Dispatch subagent → synthesis]
```

**冗長さをなくす:**
- 相互参照先のスキルにある内容を繰り返さない
- コマンドから明らかなことを説明しない
- 同じパターンの例を複数入れない

**検証:**
```bash
wc -w skills/path/SKILL.md
# getting-started workflows: aim for <150 each
# Other frequently-loaded: aim for <200 total
```

**自分が何をするか、または核心の洞察で名付ける:**
- ✅ `condition-based-waiting` > `async-test-helpers`
- ✅ `using-skills`（`skill-usage` ではなく）
- ✅ `flatten-with-flags` > `data-structure-refactoring`
- ✅ `root-cause-tracing` > `debugging-techniques`

**動名詞（-ing）はプロセスにうまく機能します:**
- `creating-skills`、`testing-skills`、`debugging-with-logs`
- 能動的で、あなたが取る行動を表す

### 5. ほかのスキルへの相互参照

**ほかのスキルを参照するドキュメントを書くとき:**

スキル名だけを使い、明示的な要件マーカーを付けます。
- ✅ 良い: `**必須サブスキル:** superpowers:test-driven-development を使います`
- ✅ 良い: `**必須の前提知識:** superpowers:systematic-debugging を必ず理解していなければなりません`
- ❌ 悪い: `See skills/testing/test-driven-development`（必須かどうか不明確）
- ❌ 悪い: `@skills/testing/test-driven-development/SKILL.md`（強制的に読み込まれ、コンテキストを消費する）

**@ リンクを使わない理由:** `@` 構文はファイルを即座に強制的に読み込み、必要になる前に 200k 以上のコンテキストを消費します。
