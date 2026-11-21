---
name: using-git-worktrees
description: 現在のワークスペースから隔離する必要がある機能開発を始めるとき、または実装計画を実行する前に使います - ネイティブツール、またはフォールバックとして git worktree により、隔離されたワークスペースを確実に用意します
---

# git worktree の使い方

## 概要

作業が隔離されたワークスペースで行われるようにします。プラットフォームのネイティブな worktree ツールを優先してください。ネイティブツールが使えないときに限り、手動の git worktree にフォールバックします。

**基本原則:** まず既存の隔離を検出します。次にネイティブツールを使います。その次に git にフォールバックします。ハーネスと争ってはいけません。

**開始時に宣言する:** 「using-git-worktrees スキルを使って、隔離されたワークスペースを用意します。」

## ステップ 0: 既存の隔離を検出する

**何かを作る前に、すでに隔離されたワークスペースにいるかどうかを確認してください。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**サブモジュールの確認:** `GIT_DIR != GIT_COMMON` は、git のサブモジュールの中でも真になります。「すでに worktree の中にいる」と結論づける前に、サブモジュールにいないことを確認してください:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**`GIT_DIR != GIT_COMMON` で（サブモジュールではない）場合:** すでにリンクされた worktree の中にいます。ステップ 2（プロジェクトのセットアップ）に進んでください。別の worktree を作ってはいけません。

ブランチの状態とあわせて報告します:
- ブランチ上にいる場合: 「すでに隔離されたワークスペース `<path>` のブランチ `<name>` にいます。」
- detached HEAD の場合: 「すでに隔離されたワークスペース `<path>` にいます（detached HEAD、外部で管理されています）。完了時にブランチの作成が必要です。」

**`GIT_DIR == GIT_COMMON` の場合（またはサブモジュールの中の場合）:** 通常のリポジトリのチェックアウトにいます。

ユーザーはあなたへの指示の中で、すでに worktree についての希望を示していますか? 示していなければ、worktree を作る前に同意を求めてください:

> 「隔離された worktree を用意しましょうか? 現在のブランチを変更から守れます。」

すでに表明されている希望があれば、尋ねずにそれに従ってください。ユーザーが同意しなければ、その場で作業し、ステップ 2 に進んでください。

## ステップ 1: 隔離されたワークスペースを作る

**手段は 2 つあります。この順序で試してください。**

### 1a. ネイティブの worktree ツール（推奨）

ユーザーは隔離されたワークスペースを求めています（ステップ 0 での同意）。worktree を作る手段をすでに持っていますか? `EnterWorktree`、`WorktreeCreate` のような名前のツールや、`/worktree` コマンド、`--worktree` フラグかもしれません。持っているなら、それを使ってステップ 2 に進んでください。

ネイティブツールは、ディレクトリの配置、ブランチの作成、後片付けを自動的に処理します。ネイティブツールがあるのに `git worktree add` を使うと、ハーネスが把握も管理もできない状態が残ります。

ネイティブな worktree ツールが使えない場合に限り、ステップ 1b に進んでください。

### 1b. git worktree へのフォールバック

**ステップ 1a が当てはまらない場合にだけ使ってください** — つまり、ネイティブな worktree ツールが使えない場合です。git を使って手動で worktree を作ります。

#### ディレクトリの選択

この優先順位に従ってください。明示的なユーザーの希望は、観察したファイルシステムの状態に常に優先します。

1. **指示の中に、worktree のディレクトリについて表明された希望がないか確認する。** ユーザーがすでに指定していれば、尋ねずにそれを使います。

2. **プロジェクトローカルの既存の worktree ディレクトリがないか確認する:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   見つかればそれを使います。両方あれば `.worktrees` を優先します。

3. **ほかに手がかりがなければ**、プロジェクトのルートにある `.worktrees/` をデフォルトにします。

#### 安全性の検証（プロジェクトローカルのディレクトリのみ）

**worktree を作る前に、そのディレクトリが ignore されていることを必ず確認しなければなりません:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**ignore されていない場合:** .gitignore に追加し、その変更をコミットしてから進みます。

**なぜ重要か:** worktree の中身を誤ってリポジトリにコミットしてしまうことを防ぎます。

#### worktree を作る

```bash
# Determine path based on chosen location
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**サンドボックスへのフォールバック:** `git worktree add` が権限エラー（サンドボックスによる拒否）で失敗したら、サンドボックスが worktree の作成を阻んだこと、代わりに現在のディレクトリで作業することをユーザーに伝えてください。そのうえで、その場でセットアップとベースラインのテストを実行します。

## ステップ 2: プロジェクトのセットアップ

適切なセットアップを自動検出して実行します:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## ステップ 3: クリーンなベースラインを確認する

テストを実行して、ワークスペースがクリーンな状態で始まることを確認します:

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**テストが失敗したら:** 失敗を報告し、先に進むか調査するかを尋ねます。

**テストが通ったら:** 準備完了と報告します。

### 報告

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## クイックリファレンス

| 状況 | 対応 |
|------|------|
| すでにリンクされた worktree の中にいる | 作成を省略する（ステップ 0） |
| サブモジュールの中にいる | 通常のリポジトリとして扱う（ステップ 0 の確認） |
| ネイティブな worktree ツールが使える | それを使う（ステップ 1a） |
| ネイティブツールがない | git worktree へのフォールバック（ステップ 1b） |
| `.worktrees/` がある | それを使う（ignore を確認する） |
| `worktrees/` がある | それを使う（ignore を確認する） |
| 両方ある | `.worktrees/` を使う |
| どちらもない | 指示ファイルを確認し、なければデフォルトの `.worktrees/` |
| ディレクトリが ignore されていない | .gitignore に追加してコミットする |
| 作成時に権限エラー | サンドボックスへのフォールバック、その場で作業する |
| ベースラインでテストが失敗 | 失敗を報告して尋ねる |
| package.json/Cargo.toml がない | 依存関係のインストールを省略する |

## よくある自己正当化

| 言い訳 | 現実 |
|--------|------|
| 「どう見ても worktree の中にはいないから、確認は不要」 | ステップ 0 を実行してください。ハーネスが作った隔離もサブモジュールも、目視では見誤ります。検出コマンドが決着をつけます。 |
| 「ネイティブツールを探すより `git worktree add` のほうが速い」 | ネイティブツール（例: `EnterWorktree`）が、配置、ブランチの作成、後片付けを担います。それを迂回するのが最大の間違いです — ハーネスが把握も管理もできない状態が残ります。 |
| 「worktree のディレクトリは、きっともう ignore されている」 | `git check-ignore` を実行してください。worktree ディレクトリが ignore されていないと、ツリー全体が誤ってコミットされます。 |
| 「ディレクトリ名は何でもいい」 | 優先順位は、明示的な指示 > プロジェクトローカルの既存ディレクトリ > デフォルトの `.worktrees/` です。 |
| 「ワークスペースは新品だから、ベースラインのテストは後回しでいい」 | 汚れたベースラインは、後のすべての失敗をあいまいにします。今テストを実行してください。失敗を無視して進むかどうかは、人間のパートナーが決めることです。 |
