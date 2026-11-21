# スキル作成のベストプラクティス

> エージェントが見つけて使いこなせる、効果的なスキルの書き方を学びます。

優れたスキルは、簡潔で、よく構造化され、実際の利用でテストされています。このガイドは、エージェントが効果的に発見して使えるスキルを書くための、実践的な作成上の判断を示します。

スキルがどのように機能するかの概念的な背景は、[Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) を参照してください。

## 基本原則

### 簡潔さが鍵

[コンテキストウィンドウ](https://platform.claude.com/docs/en/build-with-claude/context-windows) は公共財です。あなたのスキルは、エージェントが知っておく必要のあるほかのすべてとコンテキストウィンドウを共有します。それには次のものが含まれます。

* システムプロンプト
* 会話履歴
* ほかのスキルのメタデータ
* あなたの実際のリクエスト

スキルのすべてのトークンに、即座にコストがかかるわけではありません。起動時には、すべてのスキルのメタデータ（name と description）だけが事前に読み込まれます。エージェントは、スキルが関連するものになったときにだけ SKILL.md を読み、追加のファイルは必要に応じてのみ読みます。それでも SKILL.md を簡潔にすることは重要です。エージェントが一度読み込んだら、すべてのトークンが会話履歴やほかのコンテキストと競合するからです。

**既定の前提**: エージェントはすでに非常に賢い

エージェントがまだ持っていないコンテキストだけを追加してください。それぞれの情報を吟味します。

* 「エージェントは本当にこの説明を必要としているか?」
* 「エージェントがこれを知っていると仮定してよいか?」
* 「この段落は、そのトークンコストに見合うか?」

**良い例: 簡潔**（約 50 トークン）:

````markdown  theme={null}
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**悪い例: 冗長すぎる**（約 150 トークン）:

```markdown  theme={null}
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
```

簡潔なバージョンは、エージェントが PDF とは何か、ライブラリがどう機能するかを知っていると仮定しています。

### 適切な自由度を設定する

具体性の度合いを、タスクの壊れやすさと変動の大きさに合わせます。

**高い自由度**（テキストベースの指示）:

次の場合に使います。

* 複数のアプローチが妥当である
* 判断がコンテキストに依存する
* ヒューリスティクスがアプローチを導く

例:

```markdown  theme={null}
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

**中程度の自由度**（疑似コード、またはパラメータ付きのスクリプト）:

次の場合に使います。

* 望ましいパターンがある
* ある程度のばらつきが許容される
* 設定が挙動に影響する

例:

````markdown  theme={null}
## Generate report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
    # Optionally include visualizations
```
````

**低い自由度**（特定のスクリプト、パラメータが少ないか、まったくない）:

次の場合に使います。

* 操作が壊れやすく、エラーを起こしやすい
* 一貫性が極めて重要である
* 特定の順序に従わなければならない

例:

````markdown  theme={null}
## Database migration

Run exactly this script:

```bash
python scripts/migrate.py --verify --backup
```

Do not modify the command or add additional flags.
````

**たとえ話**: エージェントを、道を探索するロボットだと考えてください。

* **両側が崖になっている狭い橋**: 安全に進める道は 1 つしかありません。具体的なガードレールと正確な指示を与えます（低い自由度）。例: 正確な順序で実行しなければならないデータベースのマイグレーション。
* **危険のない開けた野原**: 成功に至る道はたくさんあります。大まかな方向を示し、最適なルートを見つけることをエージェントに任せます（高い自由度）。例: コンテキストによって最適なアプローチが決まるコードレビュー。

### 使う予定のすべてのモデルでテストする

スキルはモデルへの追加要素として機能するため、有効性は基盤となるモデルに左右されます。スキルを使う予定のすべてのモデルでテストしてください。

**モデルごとのテストの観点**:

* **Claude Haiku**（高速、経済的）: スキルは十分なガイダンスを提供しているか
* **Claude Sonnet**（バランス型）: スキルは明確で効率的か
* **Claude Opus**（強力な推論）: スキルは説明しすぎを避けているか

Opus で完璧に機能するものが、Haiku ではより詳しい説明を必要とすることがあります。複数のモデルでスキルを使う予定なら、そのすべてでうまく機能する指示を目指してください。

## スキルの構造

<Note>
  **YAML frontmatter**: SKILL.md の frontmatter には 2 つのフィールドが必要です。

  * `name` - スキルの人間が読める名前（最大 64 文字）
  * `description` - スキルが何をするか、いつ使うかの 1 行の説明（最大 1024 文字）

  スキルの構造の完全な詳細は、[Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure) を参照してください。
</Note>

### 命名規則

一貫した命名パターンを使うと、スキルを参照したり議論したりしやすくなります。スキルの名前には**動名詞形**（動詞 + -ing）を使うことを推奨します。スキルが提供する活動や能力を明確に表すからです。

**良い命名の例（動名詞形）**:

* 「Processing PDFs」
* 「Analyzing spreadsheets」
* 「Managing databases」
* 「Testing code」
* 「Writing documentation」

**許容できる代替案**:

* 名詞句: 「PDF Processing」、「Spreadsheet Analysis」
* 動作指向: 「Process PDFs」、「Analyze Spreadsheets」

**避けるもの**:

* 曖昧な名前: 「Helper」、「Utils」、「Tools」
* 一般的すぎる名前: 「Documents」、「Data」、「Files」
* スキルのコレクション内で一貫しないパターン

一貫した命名には、次の利点があります。

* ドキュメントや会話でスキルを参照しやすくなる
* スキルが何をするかが、ひと目でわかる
* 複数のスキルを整理し、検索しやすくなる
* プロフェッショナルで一貫したスキルライブラリを維持できる

### 効果的な description を書く

`description` フィールドはスキルの発見を可能にするもので、スキルが何をするかと、いつ使うかの両方を含めるべきです。

<Warning>
  **必ず三人称で書いてください**。description はシステムプロンプトに注入されるため、視点が一貫していないと発見の問題を引き起こすことがあります。

  * **良い:** 「Processes Excel files and generates reports」
  * **避ける:** 「I can help you process Excel files」
  * **避ける:** 「You can use this to process Excel files」
</Warning>

**具体的に書き、重要な用語を含めてください**。スキルが何をするかと、いつ使うかの具体的なトリガー・コンテキストの両方を含めます。

各スキルには、description フィールドがちょうど 1 つあります。description はスキルの選択にとって極めて重要です。エージェントは、利用可能な 100 以上にもなり得るスキルの中から適切なものを選ぶために、これを使います。description は、エージェントがこのスキルをいつ選ぶべきかを判断するのに十分な詳細を提供しなければなりません。一方、SKILL.md のそれ以外の部分が実装の詳細を提供します。

効果的な例:

**PDF Processing スキル:**

```yaml  theme={null}
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Excel Analysis スキル:**

```yaml  theme={null}
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```

**Git Commit Helper スキル:**

```yaml  theme={null}
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

次のような曖昧な description は避けてください。

```yaml  theme={null}
description: Helps with documents
```

```yaml  theme={null}
description: Processes data
```

```yaml  theme={null}
description: Does stuff with files
```

### 段階的開示のパターン

SKILL.md は、オンボーディングガイドの目次のように、必要に応じてエージェントを詳細な資料へ案内する概要として機能します。段階的開示の仕組みの説明は、概要の [How Skills work](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work) を参照してください。

**実践的なガイダンス:**

* 最適なパフォーマンスのために、SKILL.md の本文は 500 行未満に保つ
* この上限に近づいたら、内容を別のファイルに分割する
* 以下のパターンを使って、指示、コード、リソースを効果的に整理する

#### 視覚的な概要: 単純なものから複雑なものへ

基本的なスキルは、メタデータと指示を含む SKILL.md ファイルだけから始まります。

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=87782ff239b297d9a9e8e1b72ed72db9" alt="Simple SKILL.md file showing YAML frontmatter and markdown body" data-og-width="2048" width="2048" data-og-height="1153" height="1153" data-path="images/agent-skills-simple-file.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=c61cc33b6f5855809907f7fda94cd80e 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=90d2c0c1c76b36e8d485f49e0810dbfd 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=ad17d231ac7b0bea7e5b4d58fb4aeabb 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=f5d0a7a3c668435bb0aee9a3a8f8c329 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=0e927c1af9de5799cfe557d12249f6e6 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=46bbb1a51dd4c8202a470ac8c80a893d 2500w" />

スキルが成長するにつれて、エージェントが必要なときにだけ読み込む追加の内容を同梱できます。

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=a5e0aa41e3d53985a7e3e43668a33ea3" alt="Bundling additional reference files like reference.md and forms.md." data-og-width="2048" width="2048" data-og-height="1327" height="1327" data-path="images/agent-skills-bundling-content.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=f8a0e73783e99b4a643d79eac86b70a2 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=dc510a2a9d3f14359416b706f067904a 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=82cd6286c966303f7dd914c28170e385 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=56f3be36c77e4fe4b523df209a6824c6 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=d22b5161b2075656417d56f41a74f3dd 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=3dd4bdd6850ffcc96c6c45fcb0acd6eb 2500w" />

完全なスキルのディレクトリ構造は、次のようになることがあります。

```
pdf/
├── SKILL.md              # Main instructions (loaded when triggered)
├── FORMS.md              # Form-filling guide (loaded as needed)
├── reference.md          # API reference (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/
    ├── analyze_form.py   # Utility script (executed, not loaded)
    ├── fill_form.py      # Form filling script
    └── validate.py       # Validation script
```

#### パターン 1: 参照を持つ高レベルのガイド

````markdown  theme={null}
---
name: PDF Processing
description: Extracts text and tables from PDF files, fills forms, and merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## Quick start

Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
````

エージェントは、FORMS.md、REFERENCE.md、EXAMPLES.md を必要なときにだけ読み込みます。

#### パターン 2: ドメイン別の構成

複数のドメインを持つスキルでは、無関係なコンテキストの読み込みを避けるために、ドメインごとに内容を整理します。ユーザーが売上指標について尋ねたとき、エージェントが読む必要があるのは売上関連のスキーマだけで、財務やマーケティングのデータは不要です。これにより、トークンの使用量が低く保たれ、コンテキストが集中したままになります。

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

````markdown SKILL.md theme={null}
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline, accounts → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features, adoption → See [reference/product.md](reference/product.md)
**Marketing**: Campaigns, attribution, email → See [reference/marketing.md](reference/marketing.md)

## Quick search

Find specific metrics using grep:

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
grep -i "api usage" reference/product.md
```
````

#### パターン 3: 条件付きの詳細

基本的な内容を示し、高度な内容へリンクします。

```markdown  theme={null}
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

エージェントは、ユーザーがそれらの機能を必要とするときにだけ REDLINING.md や OOXML.md を読みます。

### 深くネストした参照を避ける

エージェントは、参照されたファイルからさらに参照されているファイルを、部分的にしか読まないことがあります。ネストした参照に遭遇すると、エージェントはファイル全体を読む代わりに `head -100` のようなコマンドで内容をプレビューし、不完全な情報になることがあります。

**参照は SKILL.md から 1 階層の深さにとどめてください**。必要なときにエージェントがファイル全体を読むよう、すべての参照ファイルは SKILL.md から直接リンクしてください。

**悪い例: 深すぎる**:

```markdown  theme={null}
# SKILL.md
See [advanced.md](advanced.md)...

# advanced.md
See [details.md](details.md)...

# details.md
Here's the actual information...
```

**良い例: 1 階層の深さ**:

```markdown  theme={null}
# SKILL.md

**Basic usage**: [instructions in SKILL.md]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
**Examples**: See [examples.md](examples.md)
```

### 長い参照ファイルは目次で構造化する

100 行を超える参照ファイルには、先頭に目次を入れます。これにより、部分的な読み取りでプレビューする場合でも、エージェントは利用可能な情報の全体像を把握できます。

**例**:

```markdown  theme={null}
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...

## Core methods
...
```

エージェントは、そのうえでファイル全体を読むことも、必要に応じて特定の節へ移動することもできます。

このファイルシステムベースのアーキテクチャがどのように段階的開示を可能にするかの詳細は、下の「高度な内容」にある[ランタイム環境](#runtime-environment)の節を参照してください。

## ワークフローとフィードバックループ

### 複雑なタスクにはワークフローを使う

複雑な操作を、明確で順序立った手順に分解します。特に複雑なワークフローでは、エージェントが応答にコピーして、進めながらチェックを付けられるチェックリストを提供してください。

**例 1: 調査の統合ワークフロー**（コードを含まないスキル向け）:

````markdown  theme={null}
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```

**Step 1: Read all source documents**

Review each document in the `sources/` directory. Note the main arguments and supporting evidence.

**Step 2: Identify key themes**

Look for patterns across sources. What themes appear repeatedly? Where do sources agree or disagree?

**Step 3: Cross-reference claims**

For each major claim, verify it appears in the source material. Note which source supports each point.

**Step 4: Create structured summary**

Organize findings by theme. Include:
- Main claim
- Supporting evidence from sources
- Conflicting viewpoints (if any)

**Step 5: Verify citations**

Check that every claim references the correct source document. If citations are incomplete, return to Step 3.
````

この例は、コードを必要としない分析タスクにワークフローがどう適用されるかを示しています。チェックリストのパターンは、複雑な複数ステップのどんなプロセスにもうまく機能します。

**例 2: PDF フォーム入力のワークフロー**（コードを含むスキル向け）:

````markdown  theme={null}
## PDF form filling workflow

Copy this checklist and check off items as you complete them:

```
Task Progress:
- [ ] Step 1: Analyze the form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill the form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)
```

**Step 1: Analyze the form**

Run: `python scripts/analyze_form.py input.pdf`

This extracts form fields and their locations, saving to `fields.json`.

**Step 2: Create field mapping**

Edit `fields.json` to add values for each field.

**Step 3: Validate mapping**

Run: `python scripts/validate_fields.py fields.json`

Fix any validation errors before continuing.

**Step 4: Fill the form**

Run: `python scripts/fill_form.py input.pdf fields.json output.pdf`

**Step 5: Verify output**

Run: `python scripts/verify_output.py output.pdf`

If verification fails, return to Step 2.
````

明確な手順は、エージェントが重要な検証を飛ばすのを防ぎます。チェックリストは、あなたとエージェントの双方が、複数ステップのワークフローの進捗を追うのに役立ちます。

### フィードバックループを実装する

**よくあるパターン**: バリデーターを実行 → エラーを修正 → 繰り返す

このパターンは出力の品質を大幅に向上させます。

**例 1: スタイルガイドへの準拠**（コードを含まないスキル向け）:

```markdown  theme={null}
## Content review process

1. Draft your content following the guidelines in STYLE_GUIDE.md
2. Review against the checklist:
   - Check terminology consistency
   - Verify examples follow the standard format
   - Confirm all required sections are present
3. If issues found:
   - Note each issue with specific section reference
   - Revise the content
   - Review the checklist again
4. Only proceed when all requirements are met
5. Finalize and save the document
```

これは、スクリプトの代わりに参照ドキュメントを使った検証ループのパターンを示しています。「バリデーター」は STYLE\_GUIDE.md であり、エージェントは読んで比較することでチェックを行います。

**例 2: ドキュメントの編集プロセス**（コードを含むスキル向け）:

```markdown  theme={null}
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues in the XML
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild: `python ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. Test the output document
```

検証ループはエラーを早期に捕捉します。

## コンテンツのガイドライン

### 時間に依存する情報を避ける

古くなる情報を含めないでください。

**悪い例: 時間に依存する**（誤りになる）:

```markdown  theme={null}
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**良い例**（「古いパターン」の節を使う）:

```markdown  theme={null}
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>

The v1 API used: `api.example.com/v1/messages`

This endpoint is no longer supported.
</details>
```

古いパターンの節は、主要な内容を散らかすことなく、歴史的な文脈を提供します。

### 一貫した用語を使う

1 つの用語を選び、スキル全体でそれを使います。

**良い - 一貫している**:

* 常に「API endpoint」
* 常に「field」
* 常に「extract」

**悪い - 一貫していない**:

* 「API endpoint」「URL」「API route」「path」を混在させる
* 「field」「box」「element」「control」を混在させる
* 「extract」「pull」「get」「retrieve」を混在させる

一貫性は、エージェントが指示を理解して従うのに役立ちます。

## よくあるパターン

### テンプレートのパターン

出力形式のテンプレートを提供します。厳格さの度合いを、必要に合わせます。

**厳格な要件の場合**（API のレスポンスやデータ形式など）:

````markdown  theme={null}
## Report structure

ALWAYS use this exact template structure:

```markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data
- Finding 3 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```
````

**柔軟なガイダンスの場合**（適応が有用なとき）:

````markdown  theme={null}
## Report structure

Here is a sensible default format, but use your best judgment based on the analysis:

```markdown
# [Analysis Title]

## Executive summary
[Overview]

## Key findings
[Adapt sections based on what you discover]

## Recommendations
[Tailor to the specific context]
```

Adjust sections as needed for the specific analysis type.
````

### 例のパターン

出力の品質が例を見ることに左右されるスキルでは、通常のプロンプトと同じように、入力と出力のペアを提供します。

````markdown  theme={null}
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

**Example 3:**
Input: Updated dependencies and refactored error handling
Output:
```
chore: update dependencies and refactor error handling

- Upgrade lodash to 4.17.21
- Standardize error response format across endpoints
```

Follow this style: type(scope): brief description, then detailed explanation.
````

例は、説明だけの場合よりも、望ましいスタイルと詳細さの度合いをエージェントが明確に理解するのに役立ちます。

### 条件付きワークフローのパターン

エージェントを判断ポイントに沿って導きます。

```markdown  theme={null}
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

<Tip>
  ワークフローが大きくなったり、多くの手順で複雑になったりする場合は、別々のファイルに押し出し、目の前のタスクに応じて適切なファイルを読むようエージェントに指示することを検討してください。
</Tip>

## 評価と反復

### 評価を先に作る

**大がかりなドキュメントを書く前に、評価を作成してください。** これにより、スキルが想像上の問題を文書化するのではなく、実際の問題を解決することが確実になります。

**評価駆動の開発:**

1. **ギャップを特定する**: スキルなしで、代表的なタスクでエージェントを実行します。具体的な失敗や不足しているコンテキストを記録します
2. **評価を作成する**: これらのギャップをテストする 3 つのシナリオを作ります
3. **ベースラインを確立する**: スキルなしでのエージェントのパフォーマンスを測定します
4. **最小限の指示を書く**: ギャップに対処し、評価に合格するのに足りるだけの内容を作ります
5. **反復する**: 評価を実行し、ベースラインと比較し、改善します

このアプローチにより、実現しないかもしれない要件を先取りするのではなく、実際の問題を解決していることが確かになります。

**評価の構造**:

```json  theme={null}
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file and save it to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads the PDF file using an appropriate PDF processing library or command-line tool",
    "Extracts text content from all pages in the document without missing any pages",
    "Saves the extracted text to a file named output.txt in a clear, readable format"
  ]
}
```

<Note>
  この例は、単純なテストの評価基準を用いたデータ駆動の評価を示しています。これらの評価を実行するための組み込みの方法は、現時点では提供していません。ユーザーは独自の評価システムを作成できます。評価は、スキルの有効性を測るための信頼できる情報源です。
</Note>

### エージェントとともにスキルを反復的に開発する

最も効果的なスキル開発のプロセスには、エージェント自身が関わります。1 つのインスタンス（「エージェント A」）とともに、ほかのインスタンス（「エージェント B」）が使うスキルを作成します。エージェント A は指示の設計と改善を助け、エージェント B は実際のタスクでそれをテストします。これがうまく機能するのは、基盤となるモデルが、効果的なエージェントへの指示の書き方と、エージェントがどんな情報を必要とするかの両方を理解しているからです。

**新しいスキルを作成する:**

1. **スキルなしでタスクを完了する**: 通常のプロンプトで、エージェント A とともに問題に取り組みます。作業しながら、自然にコンテキストを提供し、好みを説明し、手続き的な知識を共有することになります。繰り返し提供している情報に注目してください。

2. **再利用できるパターンを特定する**: タスクを完了したあと、将来の似たタスクに役立つはずの、自分が提供したコンテキストを特定します。

   **例**: BigQuery の分析に取り組んだなら、テーブル名、フィールドの定義、フィルタリングのルール（「テストアカウントを常に除外する」など）、よくあるクエリのパターンを提供したかもしれません。

3. **エージェント A にスキルの作成を依頼する**: 「今使った BigQuery の分析パターンを捉えたスキルを作成してください。テーブルスキーマ、命名規則、テストアカウントを除外するルールを含めてください。」

   <Tip>
     最近のエージェントは、スキルの形式と構造をネイティブに理解しています。スキルの作成を手伝ってもらうために、特別なシステムプロンプトや「スキルを書くスキル」は必要ありません。エージェントにスキルの作成を頼むだけで、適切な frontmatter と本文を持つ、正しく構造化された SKILL.md の内容が生成されます。
   </Tip>

4. **簡潔さをレビューする**: エージェント A が不要な説明を加えていないかを確認します。次のように頼みます。「勝率とは何かの説明は削除してください - エージェントはすでに知っています。」

5. **情報アーキテクチャを改善する**: エージェント A に、内容をより効果的に整理するよう頼みます。たとえば次のとおりです。「テーブルスキーマは別の参照ファイルに入れるよう整理してください。あとでテーブルを追加するかもしれません。」

6. **似たタスクでテストする**: 関連するユースケースで、エージェント B（スキルを読み込んだ新しいインスタンス）とともにスキルを使います。エージェント B が正しい情報を見つけ、ルールを正しく適用し、タスクをうまく処理するかを観察します。

7. **観察に基づいて反復する**: エージェント B が苦戦したり何かを見落としたりした場合は、具体的な内容を持ってエージェント A に戻ります。「エージェントがこのスキルを使ったとき、第 4 四半期の日付によるフィルタリングを忘れました。日付フィルタリングのパターンに関する節を追加すべきでしょうか?」

**既存のスキルを反復する:**

スキルを改善するときも、同じ階層的なパターンが続きます。次の 2 つを交互に行います。

* **エージェント A とともに作業する**（スキルの改善を助ける専門家）
* **エージェント B でテストする**（スキルを使って実際の作業を行うエージェント）
* **エージェント B の挙動を観察し**、得られた洞察をエージェント A に持ち帰る

1. **実際のワークフローでスキルを使う**: エージェント B（スキルを読み込み済み）に、テストシナリオではなく実際のタスクを与えます

2. **エージェント B の挙動を観察する**: どこで苦戦し、どこで成功し、どこで予想外の選択をするかに注目します

   **観察の例**: 「エージェント B に地域別の売上レポートを頼んだとき、スキルにこのルールが書かれているのに、クエリを書いたものの、テストアカウントの除外を忘れました。」

3. **改善のためにエージェント A に戻る**: 現在の SKILL.md を共有し、観察したことを説明します。次のように頼みます。「地域別レポートを頼んだとき、エージェント B がテストアカウントの除外を忘れたことに気づきました。スキルにはフィルタリングが書かれていますが、目立ち方が足りないのでしょうか?」

4. **エージェント A の提案をレビューする**: エージェント A は、ルールをより目立たせるための再編成、「always filter」の代わりに「MUST filter」のようなより強い言葉の使用、ワークフローの節の再構成を提案するかもしれません。

5. **変更を適用してテストする**: エージェント A の改良でスキルを更新し、似たリクエストでエージェント B を使って再びテストします

6. **使用状況に基づいて繰り返す**: 新しいシナリオに出会うたびに、この観察・改善・テストのサイクルを続けます。各反復は、想定ではなく、エージェントの実際の挙動に基づいてスキルを改善します。

**チームのフィードバックを集める:**

1. スキルをチームメイトと共有し、その使われ方を観察する
2. 次を尋ねる: スキルは期待どおりに起動するか。指示は明確か。何が足りないか。
3. 自分自身の使用パターンの盲点に対処するために、フィードバックを取り入れる

**このアプローチがうまく機能する理由**: エージェント A がエージェントのニーズを理解し、あなたがドメインの専門知識を提供し、エージェント B が実際の使用を通じてギャップを明らかにし、反復的な改善が、想定ではなく観察された挙動に基づいてスキルを良くします。

### エージェントがスキルをどう辿るかを観察する

スキルを反復するときは、エージェントが実際にそれをどう使っているかに注意を払ってください。次の点に注目します。

* **予想外の探索経路**: エージェントが、あなたが想定していなかった順序でファイルを読んでいないか。構造が思ったほど直感的ではない可能性があります
* **見落とされたつながり**: エージェントが重要なファイルへの参照を辿れていないか。リンクをより明示的に、または目立たせる必要があるかもしれません
* **特定の節への過度な依存**: エージェントが同じファイルを繰り返し読むなら、その内容を主要な SKILL.md に入れるべきではないか検討してください
* **無視された内容**: エージェントが同梱ファイルに一度もアクセスしないなら、それは不要か、主要な指示の中での示し方が不十分なのかもしれません

想定ではなく、これらの観察に基づいて反復してください。スキルのメタデータにある 'name' と 'description' は、特に重要です。エージェントは、現在のタスクに応じてスキルを起動するかどうかを判断するときに、これらを使います。スキルが何をするか、いつ使うべきかを、明確に説明していることを確認してください。

## 避けるべきアンチパターン

### Windows 形式のパスを避ける

Windows 上でも、ファイルパスには常にスラッシュを使います。

* ✓ **良い**: `scripts/helper.py`、`reference/guide.md`
* ✗ **避ける**: `scripts\helper.py`、`reference\guide.md`

Unix 形式のパスはすべてのプラットフォームで動作しますが、Windows 形式のパスは Unix システムでエラーを引き起こします。

### 選択肢を提示しすぎない

必要でない限り、複数のアプローチを提示しないでください。

````markdown  theme={null}
**Bad example: Too many choices** (confusing):
"You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."

**Good example: Provide a default** (with escape hatch):
"Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."
````

## 高度な内容: 実行可能なコードを含むスキル

以下の節は、実行可能なスクリプトを含むスキルに焦点を当てています。スキルが markdown の指示だけを使うなら、[効果的なスキルのチェックリスト](#checklist-for-effective-skills)まで読み飛ばしてください。

### 解決し、丸投げしない

スキルのスクリプトを書くときは、エージェントに丸投げするのではなく、エラー条件を処理します。

**良い例: エラーを明示的に処理する**:

```python  theme={null}
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        # Create file with default content instead of failing
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        # Provide alternative instead of failing
        print(f"Cannot access {path}, using default")
        return ''
```

**悪い例: エージェントに丸投げする**:

```python  theme={null}
def process_file(path):
    # Just fail and let the agent figure it out
    return open(path).read()
```

設定パラメータも、「ブードゥー定数」（Ousterhout の法則）を避けるために、根拠を示して文書化すべきです。正しい値がわからないなら、エージェントはどうやってそれを決めるのでしょうか?

**良い例: 自己文書化されている**:

```python  theme={null}
# HTTP requests typically complete within 30 seconds
# Longer timeout accounts for slow connections
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
# Most intermittent failures resolve by the second retry
MAX_RETRIES = 3
```

**悪い例: マジックナンバー**:

```python  theme={null}
TIMEOUT = 47  # Why 47?
RETRIES = 5   # Why 5?
```

### ユーティリティスクリプトを提供する

エージェントがスクリプトを書けるとしても、あらかじめ用意したスクリプトには利点があります。

**ユーティリティスクリプトの利点**:

* 生成されたコードより信頼できる
* トークンを節約できる（コードをコンテキストに含める必要がない）
* 時間を節約できる（コードの生成が不要）
* 使用のたびに一貫性が保たれる

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=4bbc45f2c2e0bee9f2f0d5da669bad00" alt="Bundling executable scripts alongside instruction files" data-og-width="2048" width="2048" data-og-height="1154" height="1154" data-path="images/agent-skills-executable-scripts.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=9a04e6535a8467bfeea492e517de389f 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=e49333ad90141af17c0d7651cca7216b 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=954265a5df52223d6572b6214168c428 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=2ff7a2d8f2a83ee8af132b29f10150fd 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=48ab96245e04077f4d15e9170e081cfb 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=0301a6c8b3ee879497cc5b5483177c90 2500w" />

上の図は、実行可能なスクリプトが指示ファイルとどう連携するかを示しています。指示ファイル（forms.md）がスクリプトを参照し、エージェントは中身をコンテキストに読み込むことなく、それを実行できます。

**重要な区別**: エージェントが次のどちらをすべきかを、指示の中で明確にしてください。

* **スクリプトを実行する**（最も一般的）: 「`analyze_form.py` を実行してフィールドを抽出する」
* **参考として読む**（複雑なロジックの場合）: 「フィールド抽出のアルゴリズムは `analyze_form.py` を参照する」

ほとんどのユーティリティスクリプトでは、より信頼でき効率的なため、実行が推奨されます。スクリプトの実行がどう機能するかの詳細は、下の[ランタイム環境](#runtime-environment)の節を参照してください。

**例**:

````markdown  theme={null}
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF

```bash
python scripts/analyze_form.py input.pdf > fields.json
```

Output format:
```json
{
  "field_name": {"type": "text", "x": 100, "y": 200},
  "signature": {"type": "sig", "x": 150, "y": 500}
}
```

**validate_boxes.py**: Check for overlapping bounding boxes

```bash
python scripts/validate_boxes.py fields.json
# Returns: "OK" or lists conflicts
```

**fill_form.py**: Apply field values to PDF

```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```
````

### 視覚的な分析を使う

入力を画像としてレンダリングできるなら、エージェントにそれを分析させます。

````markdown  theme={null}
## Form layout analysis

1. Convert PDF to images:
   ```bash
   python scripts/pdf_to_images.py form.pdf
   ```

2. Analyze each page image to identify form fields
3. The agent can see field locations and types visually
````

<Note>
  この例では、`pdf_to_images.py` スクリプトを自分で書く必要があります。
</Note>

エージェントの視覚能力は、レイアウトと構造の理解に役立ちます。

### 検証可能な中間出力を作る

エージェントが複雑で自由度の高いタスクを実行するとき、間違いを犯すことがあります。「plan-validate-execute」パターンは、エージェントにまず構造化された形式で計画を作成させ、それを実行する前にスクリプトで検証させることで、エラーを早期に捕捉します。

**例**: スプレッドシートに基づいて、PDF の 50 個のフォームフィールドを更新するようエージェントに頼む場面を想像してください。検証がなければ、存在しないフィールドを参照したり、矛盾する値を作ったり、必須のフィールドを見落としたり、更新を誤って適用したりするかもしれません。

**解決策**: 上で示したワークフローのパターン（PDF フォームの入力）を使い、変更を適用する前に検証される中間の `changes.json` ファイルを加えます。ワークフローは、分析 → **計画ファイルを作成** → **計画を検証** → 実行 → 確認、となります。

**このパターンがうまく機能する理由:**

* **エラーを早期に捕捉する**: 変更を適用する前に、検証が問題を見つける
* **機械で検証できる**: スクリプトが客観的な検証を提供する
* **元に戻せる計画**: エージェントは、原本に触れることなく計画を反復できる
* **明確なデバッグ**: エラーメッセージが具体的な問題を指す

**使うとき**: バッチ操作、破壊的な変更、複雑な検証ルール、重大な影響を伴う操作。

**実装のヒント**: エージェントが問題を修正しやすいよう、検証スクリプトは「Field 'signature\_date' not found. Available fields: customer\_name, order\_total, signature\_date\_signed」のような具体的なエラーメッセージで詳細に出力させます。

### 依存関係をパッケージ化する

スキルは、プラットフォーム固有の制限があるコード実行環境で動作します。

* **claude.ai**: npm と PyPI からパッケージをインストールでき、GitHub リポジトリから取得できる
* **Anthropic API**: ネットワークアクセスがなく、実行時のパッケージインストールもできない

必要なパッケージを SKILL.md に列挙し、[code execution tool documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) で利用可能であることを確認してください。

### ランタイム環境

スキルは、ファイルシステムへのアクセス、bash コマンド、コード実行の機能を備えたコード実行環境で動作します。このアーキテクチャの概念的な説明は、概要の [The Skills architecture](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#the-skills-architecture) を参照してください。

**これがスキル作成にどう影響するか:**

**エージェントがスキルにアクセスする方法:**

1. **メタデータの事前読み込み**: 起動時に、すべてのスキルの YAML frontmatter にある name と description がシステムプロンプトに読み込まれます
2. **ファイルのオンデマンドの読み取り**: エージェントは、ファイル読み取りのツールを使って、必要なときにファイルシステムから SKILL.md やほかのファイルにアクセスします
3. **スクリプトの効率的な実行**: ユーティリティスクリプトは、全内容をコンテキストに読み込まずに bash で実行できます。トークンを消費するのは、スクリプトの出力だけです
4. **大きなファイルにコンテキストのペナルティがない**: 参照ファイル、データ、ドキュメントは、実際に読まれるまでコンテキストのトークンを消費しません

* **ファイルパスが重要**: エージェントは、スキルのディレクトリをファイルシステムのように辿ります。バックスラッシュではなく、スラッシュ（`reference/guide.md`）を使ってください
* **ファイルに説明的な名前を付ける**: `doc2.md` ではなく、内容を示す名前（`form_validation_rules.md`）を使います
* **発見しやすいよう整理する**: ドメインや機能ごとにディレクトリを構成します
  * 良い: `reference/finance.md`、`reference/sales.md`
  * 悪い: `docs/file1.md`、`docs/file2.md`
* **包括的なリソースを同梱する**: 完全な API ドキュメント、豊富な例、大きなデータセットを含めます。アクセスされるまでコンテキストのペナルティはありません
* **決定的な操作にはスクリプトを優先する**: エージェントに検証コードを生成させるのではなく、`validate_form.py` を書きます
* **実行の意図を明確にする**:
  * 「`analyze_form.py` を実行してフィールドを抽出する」（実行）
  * 「抽出アルゴリズムは `analyze_form.py` を参照する」（参考として読む）
* **ファイルアクセスのパターンをテストする**: 実際のリクエストでテストして、エージェントがディレクトリ構造を辿れることを確認します

**例:**

```
bigquery-skill/
├── SKILL.md (overview, points to reference files)
└── reference/
    ├── finance.md (revenue metrics)
    ├── sales.md (pipeline data)
    └── product.md (usage analytics)
```

ユーザーが収益について尋ねると、エージェントは SKILL.md を読み、`reference/finance.md` への参照を見つけ、bash を呼び出してそのファイルだけを読みます。sales.md と product.md はファイルシステム上に残り、必要になるまでコンテキストのトークンを一切消費しません。このファイルシステムベースのモデルが、段階的開示を可能にしています。エージェントは、各タスクが必要とするものを正確に辿って、選択的に読み込めます。

技術的なアーキテクチャの完全な詳細は、Skills overview の [How Skills work](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work) を参照してください。

### MCP ツールの参照

スキルが MCP（Model Context Protocol）のツールを使う場合は、「tool not found」エラーを避けるために、常に完全修飾のツール名を使います。

**形式**: `ServerName:tool_name`

**例**:

```markdown  theme={null}
Use the BigQuery:bigquery_schema tool to retrieve table schemas.
Use the GitHub:create_issue tool to create issues.
```

ここで:

* `BigQuery` と `GitHub` は MCP サーバー名です
* `bigquery_schema` と `create_issue` は、それらのサーバー内のツール名です

サーバーのプレフィックスがないと、特に複数の MCP サーバーが利用可能な場合、エージェントはツールを見つけられないことがあります。

### ツールがインストールされていると仮定しない

パッケージが利用可能だと仮定しないでください。

````markdown  theme={null}
**Bad example: Assumes installation**:
"Use the pdf library to process the file."

**Good example: Explicit about dependencies**:
"Install required package: `pip install pypdf`

Then use it:
```python
from pypdf import PdfReader
reader = PdfReader("file.pdf")
```"
````

## 技術的な注記

### YAML frontmatter の要件

SKILL.md の frontmatter には、`name`（最大 64 文字）と `description`（最大 1024 文字）のフィールドが必要です。構造の完全な詳細は [Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure) を参照してください。

### トークン予算

最適なパフォーマンスのために、SKILL.md の本文は 500 行未満に保ちます。内容がこれを超える場合は、前述の段階的開示のパターンを使って、別々のファイルに分割します。アーキテクチャの詳細は、[Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work) を参照してください。

## 効果的なスキルのチェックリスト

スキルを共有する前に、次を確認します。

### 中核となる品質

* [ ] description が具体的で、重要な用語を含んでいる
* [ ] description に、スキルが何をするかと、いつ使うかの両方が含まれている
* [ ] SKILL.md の本文が 500 行未満である
* [ ] 追加の詳細は別のファイルにある（必要な場合）
* [ ] 時間に依存する情報がない（または「古いパターン」の節にある）
* [ ] 全体を通して用語が一貫している
* [ ] 例が抽象的ではなく具体的である
* [ ] ファイルの参照が 1 階層の深さである
* [ ] 段階的開示が適切に使われている
* [ ] ワークフローに明確な手順がある

### コードとスクリプト

* [ ] スクリプトが、エージェントに丸投げせず問題を解決している
* [ ] エラー処理が明示的で、役に立つ
* [ ] 「ブードゥー定数」がない（すべての値に根拠がある）
* [ ] 必要なパッケージが指示に列挙され、利用可能であることが確認されている
* [ ] スクリプトに明確なドキュメントがある
* [ ] Windows 形式のパスがない（すべてスラッシュ）
* [ ] 重要な操作に、検証・確認の手順がある
* [ ] 品質が重要なタスクに、フィードバックループが含まれている

### テスト

* [ ] 少なくとも 3 つの評価を作成した
* [ ] Haiku、Sonnet、Opus でテストした
* [ ] 実際の使用シナリオでテストした
* [ ] チームのフィードバックを取り入れた（該当する場合）

## 次のステップ

<CardGroup cols={2}>
  <Card title="Agent Skills を始める" icon="rocket" href="https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart">
    最初のスキルを作成する
  </Card>

  <Card title="Claude Code でスキルを使う" icon="terminal" href="https://code.claude.com/docs/en/skills">
    Claude Code でスキルを作成・管理する
  </Card>

  <Card title="API でスキルを使う" icon="code" href="https://platform.claude.com/docs/en/build-with-claude/skills-guide">
    スキルをプログラムからアップロードして使う
  </Card>
</CardGroup>
