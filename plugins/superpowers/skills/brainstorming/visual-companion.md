# ビジュアルコンパニオンガイド

モックアップ、図、選択肢を見せるための、ブラウザベースのビジュアルなブレインストーミングのコンパニオンです。

## 使うとき

セッションごとではなく、質問ごとに判断してください。判断基準は、**ユーザーは読むより見たほうがよく理解できるか?** です。

内容そのものが視覚的なときは、**ブラウザを使います**。

- **UI のモックアップ** — ワイヤーフレーム、レイアウト、ナビゲーション構造、コンポーネントの設計
- **アーキテクチャ図** — システムのコンポーネント、データフロー、関係図
- **並べた視覚的な比較** — 2 つのレイアウト、2 つの配色、2 つの設計の方向性の比較
- **デザインの仕上げ** — 質問が見た目や雰囲気、余白、視覚的な階層についてのとき
- **空間的な関係** — 図として描かれる状態機械、フローチャート、エンティティの関係

内容がテキストや表形式のときは、**ターミナルを使います**。

- **要件とスコープの質問** — 「X は何を意味するのか?」「どの機能がスコープに入るのか?」
- **概念的な A/B/C の選択** — 言葉で説明されたアプローチの中から選ぶもの
- **トレードオフの一覧** — 長所と短所、比較表
- **技術的な判断** — API 設計、データモデリング、アーキテクチャのアプローチの選択
- **確認のための質問** — 答えが視覚的な好みではなく言葉であるものすべて

UI の話題*についての*質問が、自動的に視覚的な質問になるわけではありません。「どんな種類のウィザードが欲しいですか?」は概念的な質問なので、ターミナルを使います。「これらのウィザードのレイアウトのうち、どれがしっくりきますか?」は視覚的な質問なので、ブラウザを使います。

## 仕組み

サーバーはディレクトリ内の HTML ファイルを監視し、最も新しいものをブラウザに配信します。HTML の内容を `screen_dir` に書くと、ユーザーはブラウザでそれを見て、クリックして選択肢を選べます。選択は `state_dir/events` に記録され、次のターンでそれを読みます。

**コンテンツのフラグメントと完全なドキュメント:** HTML ファイルが `<!DOCTYPE` または `<html` で始まる場合、サーバーはそれをそのまま配信します（ヘルパースクリプトを注入するだけです）。そうでなければ、サーバーが自動的に内容をフレームテンプレートで包み、ヘッダー、CSS テーマ、接続状態、すべてのインタラクティブな基盤を追加します。**デフォルトではコンテンツのフラグメントを書いてください。** 完全なドキュメントを書くのは、ページを完全に制御する必要があるときだけです。

## セッションの開始

```bash
# Start AFTER the user approves the companion. --open auto-opens their browser on
# the first screen; --project-dir persists mockups and enables same-port restart.
bash scripts/start-server.sh --project-dir /path/to/project --open

# Returns: {"type":"server-started","port":52341,
#           "url":"http://localhost:52341/?key=ab12…",
#           "screen_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/content",
#           "state_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/state"}
```

レスポンスから `screen_dir` と `state_dir` を保存してください。`--open` を付けると、最初の画面を送ったときにブラウザが自動で開きます。ユーザーに開くよう頼む必要はありませんが、フォールバックとして URL も共有してください（ヘッドレスやリモートの環境では自動で開きません）。

**URL にはセッションキー（`?key=…`）が含まれます。** サーバーはキーのないリクエストをすべて拒否します。そのため、常に `url` フィールドの**完全な** URL をユーザーに渡してください。クエリ文字列を取り除いてはいけません。また、`http://host:port` だけの URL を渡してはいけません。キーは HTTP と WebSocket のアクセスを制限しており、無関係なブラウザタブやネットワーク上の別のマシンが、画面を読んだりイベントを注入したりできないようにしています。最初の読み込み後は、ブラウザが Cookie でキーを記憶するため、再読み込みや `/files/*` のアセットは、キーを繰り返さなくても動作します。

**接続情報の見つけ方:** サーバーは起動時の JSON を `$STATE_DIR/server-info` に書き出します。サーバーをバックグラウンドで起動して stdout を取得しなかった場合は、そのファイルを読んで URL とポートを得てください。`--project-dir` を使っているときは、`<project>/.superpowers/brainstorm/` でセッションのディレクトリを確認してください。

**注意:** モックアップが `.superpowers/brainstorm/` に残り、サーバーの再起動後も保たれるように、プロジェクトのルートを `--project-dir` として渡してください。渡さないと、ファイルは `/tmp` に置かれ、削除されます。`.superpowers/` がまだ `.gitignore` にない場合は、追加するようユーザーに伝えてください。

**プラットフォーム別のサーバーの起動:**

**Claude Code:**
```bash
# Default mode works — the script backgrounds the server itself.
bash scripts/start-server.sh --project-dir /path/to/project --open
```

Windows ではスクリプトが自動検出してフォアグラウンドモードに切り替わります（ツール呼び出しがブロックされます）。サーバーが会話のターンをまたいで生き残るように、Bash ツール呼び出しに `run_in_background: true` を指定し、次のターンで `$STATE_DIR/server-info` を読んで URL とポートを得てください。

**Codex:**
```bash
# Codex reaps background processes. The script auto-detects CODEX_CI and
# switches to foreground mode. Run it normally — no extra flags needed.
bash scripts/start-server.sh --project-dir /path/to/project --open
```

**Gemini CLI:**
```bash
# Use --foreground and set is_background: true on your shell tool call
# so the process survives across turns
bash scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**Copilot CLI:**
```bash
# Start it with Copilot CLI's non-blocking/background shell mechanism so the
# server survives across turns. Keep --foreground so the harness, not the
# script, owns backgrounding. The launcher is a .sh, so invoke it via bash
# (on Windows, call Git Bash's bash.exe from the PowerShell tool).
bash scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**その他の環境:** サーバーは会話のターンをまたいでバックグラウンドで動き続けなければなりません。環境が切り離されたプロセスを回収する場合は、`--foreground` を使い、そのプラットフォームのバックグラウンド実行の仕組みでコマンドを起動してください。

ブラウザから URL に到達できない場合（リモートやコンテナ化された環境でよくあります）は、ループバックではないホストにバインドしてください。

```bash
bash scripts/start-server.sh \
  --project-dir /path/to/project \
  --host 0.0.0.0 \
  --url-host localhost
```

返される JSON の `url` に含まれるホスト名を制御するには、`--url-host` を使います。

## ループ

1. **サーバーが動いているか確認し**、それから `screen_dir` の新しいファイルに **HTML を書きます**。
   - **必須: URL に言及したり画面を送ったりする前に、サーバーが動いていることを確認してください。** `$STATE_DIR/server-info` が存在し、`$STATE_DIR/server-stopped` が存在しないことを確認します。停止していたら、**同じ `--project-dir`** を指定して `start-server.sh` で再起動してください。同じポートが再利用されるので、ユーザーが開いているタブは自動で再接続し（サーバーが止まっている間は「paused」のオーバーレイが表示されます）、新しい URL を送る必要はありません。サーバーは 4 時間アイドル状態が続くと自動で終了します（`--idle-timeout-minutes` で設定できます）。
   - 意味のあるファイル名を使います: `platform.html`、`visual-style.html`、`layout.html`
   - **ファイル名を決して再利用してはいけません** — 画面ごとに新しいファイルを使います
   - ファイル作成ツールを使います — **cat や heredoc を決して使ってはいけません**（ターミナルにノイズが出力されます）
   - サーバーは最も新しいファイルを自動で配信します

2. **ユーザーに何が表示されるかを伝え、ターンを終えます。**
   - URL を改めて伝えます（最初だけでなく、毎ステップ）
   - 画面に表示されているものを短いテキストで要約します（例: 「ホームページのレイアウト案を 3 つ表示しています」）
   - ターミナルで返答するよう頼みます: 「ご覧になって、ご意見をお聞かせください。よければクリックで選択肢を選んでください。」

3. **次のターン** — ユーザーがターミナルで返答した後:
   - `$STATE_DIR/events` が存在すれば読みます — ユーザーのブラウザでの操作（クリック、選択）が JSON Lines で入っています
   - ユーザーのターミナルでのテキストと合わせて、全体像をつかみます
   - ターミナルのメッセージが主要なフィードバックで、`state_dir/events` は構造化された操作データを提供します

4. **繰り返すか、先に進む** — フィードバックを受けて現在の画面を変えるなら、新しいファイル（例: `layout-v2.html`）を書きます。現在のステップが確認できてからでなければ、次の質問に進んではいけません。

5. **ターミナルに戻るときはブラウザの表示を片付ける** — 次のステップにブラウザが要らないとき（例: 確認のための質問、トレードオフの議論）は、古い内容を消すために待機画面を送ります。

   ```html
   <!-- filename: waiting.html (or waiting-2.html, etc.) -->
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">Continuing in terminal...</p>
   </div>
   ```

   これにより、会話が先に進んだのに、ユーザーが解決済みの選択肢を見つめ続けることを防げます。次の視覚的な質問が出てきたら、いつもどおり新しいコンテンツのファイルを送ります。

6. 終わるまで繰り返します。

## コンテンツのフラグメントの書き方

ページの中に入る内容だけを書いてください。サーバーが自動的にフレームテンプレート（ヘッダー、テーマ CSS、接続状態、すべてのインタラクティブな基盤）で包みます。

**最小の例:**

```html
<h2>Which layout works better?</h2>
<p class="subtitle">Consider readability and visual hierarchy</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Single Column</h3>
      <p>Clean, focused reading experience</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>Two Column</h3>
      <p>Sidebar navigation with main content</p>
    </div>
  </div>
</div>
```

これだけです。`<html>` も CSS も `<script>` タグも不要です。サーバーがそのすべてを提供します。

## 使える CSS クラス

フレームテンプレートは、内容のために次の CSS クラスを提供します。

### Options（A/B/C の選択肢）

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Title</h3>
      <p>Description</p>
    </div>
  </div>
</div>
```

**複数選択:** コンテナに `data-multiselect` を追加すると、ユーザーが複数の選択肢を選べます。クリックするたびに、その項目の選択時のスタイルが切り替わります。

```html
<div class="options" data-multiselect>
  <!-- same option markup — users can select/deselect multiple -->
</div>
```

### Cards（視覚的なデザイン）

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- mockup content --></div>
    <div class="card-body">
      <h3>Name</h3>
      <p>Description</p>
    </div>
  </div>
</div>
```

### Mockup コンテナ

```html
<div class="mockup">
  <div class="mockup-header">Preview: Dashboard Layout</div>
  <div class="mockup-body"><!-- your mockup HTML --></div>
</div>
```

### Split ビュー（並べて表示）

```html
<div class="split">
  <div class="mockup"><!-- left --></div>
  <div class="mockup"><!-- right --></div>
</div>
```

### Pros/Cons（長所と短所）

```html
<div class="pros-cons">
  <div class="pros"><h4>Pros</h4><ul><li>Benefit</li></ul></div>
  <div class="cons"><h4>Cons</h4><ul><li>Drawback</li></ul></div>
</div>
```

### Mock 要素（ワイヤーフレームの構成要素）

```html
<div class="mock-nav">Logo | Home | About | Contact</div>
<div style="display: flex;">
  <div class="mock-sidebar">Navigation</div>
  <div class="mock-content">Main content area</div>
</div>
<button class="mock-button">Action Button</button>
<input class="mock-input" placeholder="Input field">
<div class="placeholder">Placeholder area</div>
```

### タイポグラフィとセクション

- `h2` — ページのタイトル
- `h3` — セクションの見出し
- `.subtitle` — タイトルの下の補足テキスト
- `.section` — 下に余白のあるコンテンツのブロック
- `.label` — 小さな大文字のラベルテキスト

## ブラウザイベントの形式

ユーザーがブラウザで選択肢をクリックすると、その操作が `$STATE_DIR/events` に記録されます（1 行に 1 つの JSON オブジェクト）。新しい画面を送ると、このファイルは自動的に消去されます。

```jsonl
{"type":"click","choice":"a","text":"Option A - Simple Layout","timestamp":1706000101}
{"type":"click","choice":"c","text":"Option C - Complex Grid","timestamp":1706000108}
{"type":"click","choice":"b","text":"Option B - Hybrid","timestamp":1706000115}
```

イベントストリーム全体は、ユーザーが探索した経路を示します — 落ち着くまでに複数の選択肢をクリックすることがあります。最後の `choice` イベントが通常は最終的な選択ですが、クリックのパターンから、ためらいや、尋ねる価値のある好みが分かることもあります。

`$STATE_DIR/events` が存在しなければ、ユーザーはブラウザを操作していません。ターミナルのテキストだけを使ってください。

## デザインのヒント

- **質問に合わせて精細さを調整します** — レイアウトならワイヤーフレーム、仕上げの質問なら仕上げ込みにします
- **各ページで質問を説明します** — 単なる「1 つ選んでください」ではなく、「どちらのレイアウトのほうがプロフェッショナルに感じますか?」と尋ねます
- **進む前に繰り返します** — フィードバックを受けて現在の画面を変えるなら、新しい版を書きます
- 1 画面につき選択肢は**最大 2〜4 個**にします
- **重要なときは実際の内容を使います** — 写真のポートフォリオなら、実際の画像（Unsplash）を使います。プレースホルダの内容は、デザイン上の問題を見えにくくします
- **モックアップは単純に保ちます** — ピクセル単位で完璧なデザインではなく、レイアウトと構造に集中します

## ファイル名

- 意味のある名前を使います: `platform.html`、`visual-style.html`、`layout.html`
- ファイル名を再利用してはいけません — 画面ごとに新しいファイルにします
- 繰り返すときは、`layout-v2.html`、`layout-v3.html` のようにバージョンの接尾辞を付けます
- サーバーは更新時刻が最も新しいファイルを配信します

## 後片付け

```bash
bash scripts/stop-server.sh $SESSION_DIR
```

セッションが `--project-dir` を使っていれば、モックアップのファイルは後で参照できるよう `.superpowers/brainstorm/` に残ります。停止時に削除されるのは、`/tmp` のセッションだけです。

## リファレンス

- フレームテンプレート（CSS のリファレンス）: `scripts/frame-template.html`
- ヘルパースクリプト（クライアント側）: `scripts/helper.js`
