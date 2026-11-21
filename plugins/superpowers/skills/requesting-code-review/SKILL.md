---
name: requesting-code-review
description: タスクの完了時、主要な機能の実装時、マージ前に、作業が要件を満たしているか検証するために使います
---

# コードレビューの依頼

問題が連鎖する前に見つけるため、コードレビュアー subagent をディスパッチします。レビュアーには評価に必要なものだけを厳選した文脈を渡します — あなたのセッションの履歴は決して渡さないでください。

**基本原則:** 早くレビューし、頻繁にレビューする。

## レビューを依頼するとき

**必須:**
- subagent-driven development で各タスクの後
- 主要な機能を完成させた後
- main にマージする前

**必須ではないが有益:**
- 行き詰まったとき（新鮮な視点を得るため）
- リファクタリングの前（ベースラインの確認）
- 複雑なバグを修正した後

## 依頼の方法

**1. git SHA を取得する:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD
HEAD_SHA=$(git rev-parse HEAD)
```

**2. コードレビュアー subagent をディスパッチする:**

`general-purpose` subagent をディスパッチし、[code-reviewer.md](code-reviewer.md) のテンプレートを埋めて渡します

**プレースホルダ:**
- `{DESCRIPTION}` - 作ったものの簡潔な要約
- `{PLAN_OR_REQUIREMENTS}` - それが何をするべきか
- `{BASE_SHA}` - 開始コミット
- `{HEAD_SHA}` - 終了コミット

**3. フィードバックに対応する:**
- Critical な問題はただちに修正する
- Important な問題は先に進む前に修正する
- Minor な問題は後のために記録しておく
- レビュアーが間違っているなら反論する（理由を添えて）

## 例

```
[Task 2 を完了した直後: 検証関数を追加]

あなた: 先に進む前にコードレビューを依頼します。

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | cut -d' ' -f1)
HEAD_SHA=$(git rev-parse HEAD)

[コードレビュアー subagent をディスパッチ]
  DESCRIPTION: 4 種類の問題を扱う verifyIndex() と repairIndex() を追加
  PLAN_OR_REQUIREMENTS: docs/superpowers/plans/deployment-plan.md の Task 2
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[subagent が返す]:
  Strengths: クリーンなアーキテクチャ、実際のテスト
  Issues:
    Important: 進捗表示がない
    Minor: 報告間隔にマジックナンバー (100)
  Assessment: 先に進んでよい

あなた: [進捗表示を修正]
[Task 3 に進む]
```

## よくある自己正当化

| 言い訳 | 現実 |
|--------|------|
| 「レビュアーをディスパッチせず、diff は自分でレビューすればいい」 | あなたは調整役です — diff をその場でレビューすると、作業を進め続けるために必要なコンテキストウィンドウを消費します。レビュアー subagent をディスパッチしてください。diff の読み込みと評価はレビュアーのコンテキスト内で完結し、あなたには指摘だけが返ってきます。 |
| 「変更を理解するには、レビュアーにセッション履歴の全体が必要だ」 | 評価に必要なものだけを厳選した文脈を渡してください。セッションの履歴は決して渡してはいけません。そうすれば、レビュアーはあなたの思考過程ではなく成果物に集中できます。 |

## 危険信号

**決してしないこと:**
- 「単純だから」とレビューを省略する
- Critical な問題を無視する
- Important な問題を直さないまま先に進む
- 妥当な技術的フィードバックに反論する

**レビュアーが間違っているとき:**
- 技術的な根拠をもって反論する
- 動作することを証明するコードやテストを示す
- 説明を求める

テンプレートはこちら: [code-reviewer.md](code-reviewer.md)
