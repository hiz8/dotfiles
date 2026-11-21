# superpowers（日本語版）

[obra/superpowers](https://github.com/obra/superpowers) v7.0.2 のスキル群を日本語へ
翻訳したプラグインです。内容は変えていません。今後のカスタマイズの土台として使います。
翻訳元・翻訳方針・用語集・翻訳手順は [UPSTREAM.md](UPSTREAM.md) を参照してください。

## Claude Code

プラグイン ID は `superpowers@hiz-dotfiles` です（marketplace 名 `hiz-dotfiles`）。
dotfiles を clone したマシンごとに次を実行します。

```sh
cd /path/to/dotfiles
claude plugin marketplace add "$PWD"
claude plugin install superpowers@hiz-dotfiles
claude plugin disable superpowers@claude-plugins-official   # 元プラグインを入れている場合
claude plugin list                                           # hiz-dotfiles 版が enabled であること
```

- `marketplace add` は `~/.claude/settings.json` に絶対パス入りの
  `extraKnownMarketplaces` を書き込みます。マシン固有の値のため、追跡している
  `claude/.claude/settings.json` には含めていません。追跡するのは `enabledPlugins` のみです
- 動作確認は headless の `claude -p` で行いました（スキルが日本語版から呼ばれること、
  SessionStart フックの注入が 1 回であること）。対話的な `/plugin` の表示は確認していません
- claude.ai 連携の `superpowers@synced` と名前が重なる旨の警告が出ることがあります。
  既知の事象で、`superpowers@hiz-dotfiles` の動作には影響しません

### 翻訳を編集した後の更新

実際に使われるのはキャッシュ（`~/.claude/plugins/cache/hiz-dotfiles/superpowers/<version>/`）
へコピーされた版です。リポジトリを編集しただけでは反映されません。

1. `.claude-plugin/plugin.json` と `.devin-plugin/plugin.json`（プラグイン直下）、リポジトリ直下の
   `.claude-plugin/marketplace.json` の `version` を上げます（例: `7.0.2-ja.2`）
2. 更新します

   ```sh
   claude plugin marketplace update hiz-dotfiles
   claude plugin update superpowers@hiz-dotfiles
   ```

3. Claude Code を再起動します（`update` は再起動で適用されます）

この手順は 2026-11-22 に `7.0.2-ja.1` から `7.0.2-ja.2` への更新で実行し、キャッシュがリポジトリと一致することを確認しました。

## GitHub Copilot CLI（未検証）

実機では試していません。反映されるのは push 済みの内容のみです。

```sh
copilot plugin marketplace add hiz8/dotfiles
copilot plugin install superpowers@hiz-dotfiles
```

リポジトリ直下の `.claude-plugin/marketplace.json` を読みます。`hooks/hooks.json` は
公式リファレンスのファイル配置表に載っており、読まれることを確認済みです。

## Devin CLI（未検証）

実機では試していません。反映されるのは push 済みの内容のみです。

```sh
devin plugins install hiz8/dotfiles#plugins/superpowers
devin plugins update superpowers
```

Devin はルート直下の `hooks.json` しか読まず、`hooks/hooks.json` は読まないとみられるため、
SessionStart フックによる `using-superpowers` の注入は行われない見込みです。スキル自体は使えます（セッション開始時に
スキル名と説明が渡されます）。

## 翻訳の検査

upstream の参照コピーと突き合わせ、構造（コードフェンス数・`<TAG>`・
`[PLACEHOLDER]`・ステータス語・`Task` 見出し数・スキル参照・URL・リンクなど）の乖離と
禁止表現を検査します。

```sh
UPSTREAM="${TMPDIR:-/tmp}/superpowers-v7.0.2"
git clone --depth 1 --branch v7.0.2 https://github.com/obra/superpowers "$UPSTREAM"   # 未取得の場合
python3 -I plugins/superpowers/scripts/check-translation.py --upstream "$UPSTREAM"
python3 -I plugins/superpowers/scripts/check-translation.py --upstream "$UPSTREAM" --skill brainstorming   # 1 スキルのみ
```

`--structure-only` を付けると構造検査のみを行います。終了コード 0 で合格です。
