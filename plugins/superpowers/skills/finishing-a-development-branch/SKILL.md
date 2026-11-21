---
name: finishing-a-development-branch
description: 実装が完了し、すべてのテストが通り、作業をどう統合するかを決める必要があるときに使います
---

# 開発ブランチの完了

## 概要

**基本原則:** テストを検証する → 環境を検出する → 選択肢を提示する → 選択を実行する → 後片付けをする。

**開始時に宣言する:** 「finishing-a-development-branch スキルを使って、この作業を完了します。」

## ステップ 1: テストを検証する

プロジェクトのテストスイート全体を実行します（`npm test` / `cargo test` / `pytest` / `go test ./...`）。

**テストが失敗したら**、失敗を報告して止まってください — メニューは、スイートがグリーンになった後に出します:

```
テストが失敗しています（<N> 件）。完了する前に修正が必要です:

[失敗を表示]
```

**テストが通ったら:** ステップ 2 に進みます。

## ステップ 2: 環境を検出する

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

これによって、どのメニューを表示するか、後片付けをどう行うかが決まります:

| 状態 | メニュー | 後片付け |
|------|----------|----------|
| `GIT_DIR == GIT_COMMON`（通常のリポジトリ） | 標準の 3 つの選択肢 | 片付ける worktree はない |
| `GIT_DIR != GIT_COMMON`、名前付きブランチ | 標準の 3 つの選択肢 | 出どころに基づく（ステップ 6 を参照） |
| `GIT_DIR != GIT_COMMON`、detached HEAD | 縮小した 2 つの選択肢（マージなし） | 外部で管理されている — そのまま残す |

## ステップ 3: ベースブランチを特定する

ベースブランチとは、この作業が分岐した元のブランチです — たいてい、計画書、会話、
またはブランチの upstream に名前があります。まだ分かっていなければ、次のように尋ねます:
「このブランチは <最も確からしい推測> から分岐しています - 合っていますか?」
マージする前に確認してください: 誤ったベースにマージすると、元に戻すのに大きな手間がかかります。

## ステップ 4: 選択肢を提示する

**通常のリポジトリ、および名前付きブランチの worktree — ちょうどこの 3 つの選択肢を提示します:**

```
実装が完了しました。どうしますか?

1. <base-branch> にローカルでマージする
2. push して Pull Request を作成する
3. ブランチをそのままにする（後で自分で対応します）

どの選択肢にしますか?
```

**detached HEAD — ちょうどこの 2 つの選択肢を提示します:**

```
実装が完了しました。detached HEAD にいます（外部で管理されているワークスペース）。

1. 新しいブランチとして push して Pull Request を作成する
2. そのままにする（後で自分で対応します）

どの選択肢にしますか?
```

メニューは書かれたとおりに提示してください — 簡潔に、すべての選択肢を上のリストから取ってきます。
作業の破棄が行われるのは、人間のパートナーが明示的にそれを求めたことへの応答としてだけです
（下の「人間のパートナーが作業の破棄を求めたとき」を参照）。人間のパートナーの答えを待ってください。
統合の判断は、人間のパートナーのものです。

## ステップ 5: 選択を実行する

### 選択肢 1: ローカルでマージする

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>
```

マージ結果でテストが失敗したら: 止まって、worktree とブランチをそのまま残し、調査してください
— まだ何も push されていないので、マージはローカルにとどまっており、元に戻せます。

マージ結果がグリーンになったら: worktree を片付け（ステップ 6）、その後ブランチを削除します:

```bash
git branch -d <feature-branch>
```

### 選択肢 2: push して PR を作成する

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

その後、フォージのツールを使って <base-branch> 宛ての pull/merge request を作成します —
CLI があればその CLI を、なければ push 時に多くのフォージが表示する作成用 URL を使い、
リポジトリに PR テンプレートや規約があればそれに従い、URL を人間のパートナーに報告します。

worktree は残してください — 人間のパートナーは PR のフィードバックへの対応をそこで繰り返し行います。

### 選択肢 3: そのままにする

報告します: 「ブランチ <name> をそのまま残します。worktree は <path> に保持されています。」

### 人間のパートナーが作業の破棄を求めたとき

この経路は、作業を捨てるという明示的な依頼への応答としてのみ存在します。まず確認してください:

```
次のものが完全に削除されます:
- ブランチ <name>
- すべてのコミット: <commit-list>
- <path> にある worktree

確認するには 'discard' と入力してください。
```

その正確な確認を待ってください。確認が届いたら:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

その後、worktree を片付け（ステップ 6）、ブランチを強制削除します:

```bash
git branch -D <feature-branch>
```

## ステップ 6: ワークスペースの後片付け

**選択肢 1 と、確認済みの破棄で実行します。** 選択肢 2 と 3 は、常に worktree を保持します。
どちらの呼び出し元もすでにメインのリポジトリのルートへディレクトリを移動しています —
worktree の削除は worktree の外から実行しなければなりません — そして、ステップ 2 で
そのディレクトリ移動より前に取得しておいた `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` の値を使います。

**`GIT_DIR == GIT_COMMON` の場合:** 通常のリポジトリで、片付ける worktree はありません。完了です。

**`WORKTREE_PATH` が `.worktrees/` または `worktrees/` の下にある場合:** この worktree は Superpowers が
作ったものです — 後片付けは私たちの責任です:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**削除が拒否された場合**（`contains modified or untracked files`）: その worktree には、ほかのどこにも
存在しないファイルがあります — コミットされていない計画書、メモ、作業用の一時ファイルなどです。
自分の判断で `--force` を使ってはいけません。何が危うい状態にあるかを人間のパートナーに示し、尋ねてください:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
Worktree の削除が拒否されました — 次のファイルは一度もコミットされていません:

<file list>

1. 後片付けの前に <branch> にコミットする
2. <main repo root> に移動する
3. 削除する（元に戻せません）

どれにしますか?
```

選択を実行してから、worktree を削除します。

**それ以外の場合:** このワークスペースはホスト環境が所有しています — そのまま残してください。
プラットフォームがワークスペースの退出用ツールを提供しているなら、それを使います。

## クイックリファレンス

| 選択肢 | マージ | push | worktree を保持 | ブランチの後片付け |
|--------|--------|------|-----------------|--------------------|
| 1. ローカルでマージする | はい | - | - | はい |
| 2. PR を作成する | - | はい | はい | - |
| 3. そのままにする | - | - | はい | - |
| 破棄（明示的な依頼のときのみ） | - | - | - | はい（強制） |

## よくある自己正当化

| 言い訳 | 現実 |
|--------|------|
| 「このセッションの前の方で、テストは通っていた」 | これから統合するツリーでスイートを実行してください。グリーンの実行が証明するのは、実行したツリーについてだけです。 |
| 「どう見てもマージしてほしいはずだ」 | 統合は人間のパートナーの判断です。メニューを提示して待ってください。 |
| 「この機能はもう終わりのようだ — 破棄を提案しよう」 | メニューは書かれたとおりで完全です。破棄が行われるのは、人間のパートナーがはっきりとそう求めたときだけです。 |
| 「『うん、捨てて』は確認になる」 | 削除を許可するのは、`discard` という語の入力だけです。 |
| 「PR を出したから、worktree はもう邪魔なだけだ」 | PR のフィードバックは、その worktree の中で直します。作業が取り込まれるまで残します。 |
| 「この別の worktree は古そうだ — これも片付けよう」 | 片付けてよいのは、`.worktrees/` または `worktrees/` の下にある worktree だけです。それ以外はすべてホストのものです。 |
| 「削除が拒否された — `--force` は後片付けを終わらせるだけだ」 | 拒否は、その worktree にしかないファイルがあることを意味します。`--force` はそれらを完全に破壊します。人間のパートナーに示して尋ねてください。 |
| 「マージ結果の失敗は、たぶん不安定なテストだろう」 | マージ結果の失敗は、すべてを止めます。調査する間、ブランチと worktree はそのまま残します。 |
| 「ベースブランチはどう見ても main だ」 | 分岐点を確認するか、尋ねてください。誤ったベースへのマージは、元に戻すのに大きな手間がかかります。 |
| 「push が拒否された — force-push すれば直る」 | push の拒否は、リモートが先に進んだことを意味します。調査してください。force-push は、人間のパートナーが明示的に求めたときだけです。 |
