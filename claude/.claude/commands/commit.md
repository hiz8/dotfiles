---
allowed-tools: Bash(git:*), Bash(npm:*), Bash(npx:*), Read, Edit, Grep, Glob
description: 変更を分析して Conventional Commits 形式のコミットを作成する
---

# Git コミット

変更内容を分析し、Conventional Commits 形式のコミットメッセージを自動生成してコミットする。

## 手順

1. 以下のコマンドを並列実行して現在の状態を把握する:
   - `git status` で未追跡・変更ファイルを確認（`-uall` フラグは使わない）
   - `git diff` と `git diff --staged` でステージ済み・未ステージの変更を確認
   - `git log --oneline -10` で直近のコミットメッセージのスタイルを確認

2. すべての変更を分析してコミットメッセージを作成する:
   - ステージ済みのファイルが存在する場合は、それのみをコミット対象とする
   - 従来のコミット形式を使用してください: `type(scope): description`
   - type の種類: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test` など
   - 1行目は簡潔に（72文字以内）
   - 必要に応じて本文で変更理由を補足する
   - シークレットを含む可能性のあるファイル（`.env`、認証情報など）はコミットしない

3. `git add` で関連ファイルを個別にステージする（`git add -A` や `git add .` は使わない）

4. HEREDOC を使ってコミットを作成する:
   ```
   git commit -m "$(cat <<'EOF'
   type: 日本語の説明

   必要に応じて変更理由を補足。

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

5. `git status` でコミットが成功したことを確認する。

## 重要なルール

- 既存のコミットを amend しない — 必ず新しいコミットを作成する
- 明示的に求められない限りリモートに push しない
- フックをスキップしない（`--no-verify` 禁止）
- `git add -A` や `git add .` は使わない — ファイルを個別に追加する
- pre-commit フックが失敗した場合は、問題を修正してから新しいコミットを作成する（amend しない）
- コミットすべき変更がない場合は、ユーザーに通知して何もしない

