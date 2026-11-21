# superpowers 日本語版プラグイン 設計

## 意図

[obra/superpowers](https://github.com/obra/superpowers) を土台に、
個人の開発手法・チームの流儀に合わせたカスタマイズを行いたい。その第一歩として、
スキル群を **内容を変えずに日本語へ翻訳** したプラグインを dotfiles 内に作る。
カスタマイズはこの翻訳版に対して後続の作業で行う（本設計の範囲外）。

## ゴール / 非ゴール / アンチゴール

- ゴール
  - superpowers v7.0.2（`22f0b463e7a5e579904dd6211a520321035526f7`、2026-11-21 時点の最新）の
    全 15 スキルを日本語化したプラグインを dotfiles で管理する
  - Claude Code（主）、GitHub Copilot CLI、Devin CLI で利用できる
  - 導入後は元の `superpowers@claude-plugins-official` を無効化して置き換える
- 非ゴール
  - 内容の改変・カスタマイズ（翻訳後の別作業）
  - Codex / Cursor / Gemini / OpenCode など他ハーネス対応
  - upstream の `tests/`・`docs/` の移植
- アンチゴール
  - 翻訳で指示の意味・強さが変わる（例: MUST / NEVER の弱体化、HARD-GATE の欠落）
  - スクリプトやパス・参照名を訳して動作を壊す
  - 英語版と日本語版が同時に読み込まれる状態で運用する

## 制約

- dotfiles は GNU Stow 管理で、`install.sh` は **リポジトリ直下の全ディレクトリを stow する**。
  プラグイン置き場（`plugins/`）とこの設計ドキュメント置き場（`docs/`）は stow 対象から外す必要がある
- upstream は MIT ライセンス。`LICENSE` を同梱する
- スキル間参照は `superpowers:<skill>` 形式で 48 箇所ある。SessionStart フックは
  `skills/using-superpowers/SKILL.md` を読んで全文を注入する
- 接頭辞（プラグイン名）は未定。後で変更する前提

## 検討したアプローチ

1. **dotfiles 内に自作プラグイン + ローカル marketplace（採用）**
   名前空間・フック・スクリプトをそのまま維持できる。個人用途で最も手軽。
2. upstream を GitHub で fork して翻訳
   upstream 追従・チーム配布に有利だが、dotfiles と別リポジトリになる。現時点では不要と判断。
3. `claude/.claude/skills/` に個人スキルとして配置
   名前空間がなくなり、フックも移せず、参照 48 箇所の書き換えが必要。不採用。

ユーザーが 1 を選択。

## 決定事項

### 配置

```
dotfiles/
├── .claude-plugin/marketplace.json     # このリポジトリをローカル marketplace にする
├── plugins/superpowers/                # プラグイン本体（stow 対象外）
│   ├── .claude-plugin/plugin.json      # Claude Code / Copilot CLI
│   ├── .devin-plugin/plugin.json       # Devin CLI
│   ├── hooks/{hooks.json,run-hook.cmd,session-start}
│   ├── skills/<15 スキル>/
│   ├── LICENSE
│   └── UPSTREAM.md                     # 翻訳元バージョン・コミット・翻訳方針・用語集
├── docs/superpowers/specs/             # 設計ドキュメント（stow 対象外）
└── install.sh                          # plugins/ と docs/ を除外
```

- プラグイン名は暫定で `superpowers` のまま。ID は `superpowers@<marketplace 名>` となり
  元プラグインと区別されるため、現時点で参照の書き換えは不要
- 後で接頭辞を変えるときは `plugin.json`（両方）の name、`superpowers:` 参照の一括置換、
  `marketplace.json`、`settings.json` の `enabledPlugins` を更新する
- `claude/.claude/settings.json` で `superpowers@claude-plugins-official` を無効化し、新プラグインを有効化
- 元プラグインの `hooks-cursor.json` と、他ハーネス向けマニフェストはコピーしない

### 翻訳方針

- 翻訳する: SKILL.md 本文、frontmatter の `description`、サブエージェント用プロンプト
  （`*-prompt.md`、`code-reviewer.md` 等）、references / templates の md、
  `hooks/session-start` が注入する文言（"You have superpowers." 等）
- 英語のまま: スキル名・ディレクトリ名・frontmatter の `name`、コード・コマンド・スクリプト
  （`.js` `.cjs` `.sh` `.ts` `.dot` など）、パス、`<HARD-GATE>` などのタグ、
  `superpowers:xxx` 参照、外部 URL
- スクリプトが解析するリテラルは英語のまま残す。特に `subagent-driven-development/scripts/task-brief`
  は計画書の見出し `Task N` を英語リテラルで解析するため、writing-plans 等で計画書の見出し形式を
  指示している箇所の `Task` は訳さない（実装者判断で追記）
- 他ハーネス向け reference（`using-superpowers/references/` の codex / gemini / pi /
  antigravity / hermes / muse）は原文のまま残す（Claude Code では読まれない。参照切れを避けるため削除しない）
- 文体: 敬体（です・ます調）、簡潔に（2026-11-21 ユーザー決定で常体から変更）。subagent / worktree / TDD などの技術用語は英語のまま
- 強調・規範語（MUST / NEVER / IMPORTANT 等）は日本語でも同等の強さで表現する
- 「〜が効く」「〜が効かない」は使わない（ユーザー CLAUDE.md の規則）
- 最初に用語集を作り（例: "your human partner" の訳語）、全スキルで統一する。用語集は `UPSTREAM.md` に置く

### 検証

- 15 スキルの frontmatter が妥当で、相対リンク・`superpowers:` 参照に切れがない
- Claude Code: プラグインが読み込まれ 15 スキルが一覧に出る / SessionStart で日本語版
  `using-superpowers` が注入される / 代表的な依頼でスキルが期待どおりに呼び出される
- Copilot CLI・Devin CLI: 今回は実機検証しない（ユーザーはこの環境とは別の環境で両 CLI を使う）。
  導入方法はドキュメント調査で確認し、手順を `plugins/superpowers/UPSTREAM.md` もしくは README に記載する

## Copilot CLI / Devin CLI の導入方式

- 両 CLI は GitHub の公開リポジトリ `hiz8/dotfiles` から導入する運用で可（ユーザー承認済み）。
  翻訳版プラグインが公開されること、push 済みの内容だけが反映されることは受け入れ済み
- 計画の最初に、ドキュメント調査で「リポジトリ直下の marketplace / サブディレクトリの
  プラグインを `owner/repo` 指定で導入できるか」を確認する。どちらの方式でも導入できないと
  分かった場合のみ、独立リポジトリへの切り出しを相談する

## 実装者に任せる事項

- marketplace 名（例: `hiz-dotfiles`）
- 翻訳作業の分割・並列化の方法
- `install.sh` での除外の実装方法
- ローカル marketplace の登録方法（`settings.json` の `extraKnownMarketplaces` か手動登録か）。
  ただし tracked な `settings.json` にマシン固有の絶対パスを書かないこと
