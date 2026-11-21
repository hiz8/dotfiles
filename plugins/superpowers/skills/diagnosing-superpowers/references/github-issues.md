# GitHub issues

`gh` がインストールされ認証済みであれば、`gh` を使います。認証、レート制限、JSON を処理してくれるためです。使えない場合は curl による公開 API に切り替え、それも使えない場合はパートナーが開く URL を渡します。

## 検索

```bash
gh search issues --repo obra/superpowers --limit 10 "<terms>" \
  --json number,state,title --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'
```

`gh` がない場合（未認証、1 分あたり 10 リクエスト）:

```bash
curl -s -H "Accept: application/vnd.github+json" \
  "https://api.github.com/search/issues?q=repo:obra/superpowers+is:issue+<url-encoded terms>&per_page=10" \
  | jq -r '.items[] | "\(.number)\t\(.state)\t\(.title)"'
```

curl もない場合は、`https://github.com/obra/superpowers/issues?q=<terms>` を渡します。

## 作成

埋め終えた `templates/issue.md` をワークスペースに書き出し、正確な文面を表示します。承認を得たら次を実行します。

```bash
gh issue create --repo obra/superpowers --title "<title>" --body-file <path> \
  --label bug --label automated-issue-report
```

報告者に push 権限がないと、GitHub はラベルを黙って捨てます。そのためラベルが付くのはコラボレーターだけです。それでも、テンプレートのフッターによって、スキルが作成した issue であることは分かります。`gh` はファイルを添付できません。issue が作成された後に、ブラウザで添付できるよう、バンドルのパスをパートナーに伝えます。

`gh` がない場合は、`bug_report.md` テンプレートであらかじめ内容を入力したリンクを渡します。このテンプレートは、どの報告者に対しても `bug` ラベルを付与します。

```
https://github.com/obra/superpowers/issues/new?template=bug_report.md&title=<url-encoded title>&body=<url-encoded body>
```

GitHub は約 8,000 文字を超える URL を拒否します。それを超える場合は、タイトルだけを含むリンクを送り、本文はファイルから貼り付けるようパートナーに伝えます。
