`prompts/analyst-common.md` を最初に読んでください。あなたの役割、入力、context-safety のルール、返す形式が書かれています。このファイルは観点を追加します。

Dimension: Repeated work

セッションが 2 回以上行った作業を見つけてください。

1. すべての tool call を `(line, turn, tool, key)` として抽出します。`key` は次のとおりです。read/edit/write ではファイルパス。シェルコマンドではコマンドのテキスト（末尾の空白は除き、コマンド全体を保つ）。subagent のディスパッチでは `description` とプロンプトの先頭 80 文字。検索ではクエリ。
2. `(tool, key)` でグループ化し、しきい値以上のグループを報告します。

   | Category | Threshold | Exempt |
   |---|---|---|
   | reads, searches | 3 | |
   | edits | 2 | |
   | shell commands | 2 | ステータス確認とテスト実行（`git status`、`ls`、`pwd`、テストランナー） |
   | subagent dispatches | 同じ description で 2 | |
3. 各グループについて、繰り返しの間に何かが変わったかを確認します（そのファイルへの書き込み、compaction、人間による訂正）。どのケースかを述べてください。edit の後の再読み込みは指摘ではありません。compaction の後の再読み込みは、compaction に帰属する指摘です。間に何もない再読み込みは、それ自体が指摘です。
4. 導き直された決定を探します。セッションの前半ですでに述べた結論（同じファイル、同じ設計上の選択、同じ実行コマンド）に、アシスタントのテキストが再び達しているものです。両方の箇所を引用してください。
5. グループごとに 1 つの指摘とし、最初と最後の行番号と回数を添えてください。
