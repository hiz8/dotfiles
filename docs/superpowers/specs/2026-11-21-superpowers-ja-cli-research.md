# Copilot CLI / Devin CLI 導入方式の調査メモ

調査日: 2026-11-21。実機検証はしていない（両 CLI とも未インストール）。
ドキュメントで確認できた事項と、未確認の事項を区別して記す。

## 結論

A: 設計どおりの配置（リポジトリ直下の `.claude-plugin/marketplace.json` と
`plugins/superpowers/`）で、両 CLI とも導入可。配置の調整は不要。

## GitHub Copilot CLI

### 導入コマンド

```bash
copilot plugin marketplace add hiz8/dotfiles
copilot plugin install superpowers@hiz-dotfiles
```

サブディレクトリを直接指定する形式（marketplace を介さない）も使える。

```bash
copilot plugin install hiz8/dotfiles:plugins/superpowers
```

### 確認できた事項

- `marketplace add` は `owner/repo`、`owner/repo#ref`、URL、ローカルパスを受け付ける。
  marketplace の名前は `marketplace.json` の `name` が登録キーになる
- `marketplace.json` の探索順は `marketplace.json`、`.plugin/marketplace.json`、
  `.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json`。
  推奨は `.github/plugin/` だが、`.claude-plugin/` も読む
- プラグインエントリの `source` は相対パス（例: `./plugins/frontend-design`）を
  指定でき、リポジトリルートからの相対として解決される。GitHub オブジェクト形式
  （`repo` / `ref` / `path` / `sha`）もある
- `plugin.json` は旧形式なら `.claude-plugin/plugin.json` も探索対象
- 上流 README は `copilot plugin marketplace add obra/superpowers-marketplace` →
  `copilot plugin install superpowers@superpowers-marketplace` の 2 段構成

### 未確認

- Copilot CLI がプラグインの `hooks/hooks.json` を読むこと自体を公式ドキュメントで
  は確認していない。上流の `hooks/session-start` に `COPILOT_CLI` 分岐があり、
  v7.0.2 のリリースノートに Copilot の PowerShell 向け `powershell` コマンド形式の
  記載があるため、上流では動作している前提と見られる（二次情報）
- 実機での `marketplace add hiz8/dotfiles` の動作（ユーザーが別環境で確認する）

### 出典

- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace
- 上流 README「GitHub Copilot CLI」節、`hooks/session-start`、`RELEASE-NOTES.md`
  （参照コピー: v7.0.2）

## Devin CLI

### 導入コマンド

```bash
devin plugins install hiz8/dotfiles#plugins/superpowers
devin plugins update superpowers
```

### 確認できた事項

- インストール元は GitHub の `owner/repo`、git URL、ローカルパス。サブフォルダの
  プラグインは `#path/to/plugin` を付けて指定する
  （公式の例: `devin plugins install acme/plugins#plugins/review`）
- マニフェストの優先順位は `.devin-plugin/plugin.json` > `.claude-plugin/plugin.json`
  > ルートの `plugin.json`。必須項目は `name` のみ。`.devin-plugin/plugin.json` が
  無ければ `.claude-plugin/plugin.json` にフォールバックする
- スキルは `skills/<name>/SKILL.md` として自動検出される
- フックはプラグインルート直下の単一 `hooks.json`。`hooks/` ディレクトリは
  ドキュメントに記載がなく、`hooks/hooks.json` は読まれない可能性が高い
- Devin に marketplace の概念はドキュメント上に出てこない（`devin plugins install`
  を直接使う）

### 配置への影響

- 設計どおり `plugins/superpowers/.devin-plugin/plugin.json` を置けば、サブフォルダ
  指定で導入できる。リポジトリ直下に `.devin-plugin/plugin.json` は不要
- 上流の Devin 対応もスキルのみで、フック・注入は使わない
  （`tests/devin/test-devin-plugin.sh` のコメントと、マニフェストに `skills` /
  `hooks` 等を含めない検査）。Devin ではセッション開始時にスキル名と説明が
  システムプロンプトへ出るため、日本語版 `description` がそのまま使われる。
  SessionStart フック経由の `using-superpowers` 全文注入は Devin では行われない
  見込み（上流と同じ挙動）
- `.devin-plugin/plugin.json` に `skills` / `hooks` を書かない（上流の方針に合わせる）

### 未確認

- 実機での `devin plugins install hiz8/dotfiles#plugins/superpowers` の動作
- `#` 以降のパスの細かな書式（先頭 `./` の要否など）は公式の例のみで確認

### 出典

- https://docs.devin.ai/cli/extensibility/plugins
- 上流 README「Devin CLI」節、`.devin-plugin/plugin.json`、
  `tests/devin/test-devin-plugin.sh`（参照コピー: v7.0.2）

## Task 12（README / UPSTREAM.md の導入手順）への引き継ぎ

- Copilot CLI: `marketplace add hiz8/dotfiles` → `install superpowers@hiz-dotfiles`
- Devin CLI: `devin plugins install hiz8/dotfiles#plugins/superpowers`
- 反映されるのは push 済みの内容のみ。どちらも実機未検証である旨を併記する
- Devin では SessionStart 注入がない点を注記する
