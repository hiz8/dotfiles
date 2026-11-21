---
name: verification-before-completion
description: 作業が完了した、修正できた、テストが通ったと主張しようとするとき、コミットや PR 作成の前に使います - 成功を主張する前に、検証コマンドを実行して出力を確認することを必須とします。主張より先に常に証拠を示します
---

# Verification Before Completion

## 概要

**基本原則:** 主張より先に、常に証拠を示してください。

**このルールの文言に違反することは、このルールの精神に違反することです。**

## 鉄則

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

このメッセージ内で検証コマンドを実行していなければ、通ったと主張してはいけません。

## ゲート関数

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## よくある失敗

| 主張 | 必要なもの | 不十分なもの |
|------|-----------|--------------|
| テストが通る | テストコマンドの出力: 失敗 0 件 | 以前の実行、「通るはず」 |
| リンターがクリーン | リンターの出力: エラー 0 件 | 部分的なチェック、推測による外挿 |
| ビルドが成功する | ビルドコマンド: 終了コード 0 | リンターが通ったこと、ログが良さそうに見えること |
| バグが直った | 元の症状をテストする: 通る | コードを変更した、直ったと思い込んでいる |
| リグレッションテストが機能する | Red-Green のサイクルを確認済み | テストが 1 回通った |
| エージェントが完了した | VCS の diff が変更を示している | エージェントが「成功」と報告した |
| 要件を満たしている | 1 行ずつのチェックリスト | テストが通っている |

## 危険信号 - 止まってください

- 「はず」「おそらく」「〜のようだ」を使っている
- 検証の前に満足を表している（「よし！」「完璧！」「完了！」など）
- 検証せずにコミット/プッシュ/PR をしようとしている
- エージェントの成功報告を信用している
- 部分的な検証に頼っている
- 「今回だけ」と考えている
- 疲れていて、作業を終わらせたい
- **検証を実行せずに成功を匂わせる、あらゆる言い回し**

## 自己正当化の防止

| 言い訳 | 現実 |
|--------|------|
| 「もう動くはず」 | 検証を**実行**してください |
| 「自信がある」 | 自信 ≠ 証拠 |
| 「今回だけ」 | 例外はありません |
| 「リンターは通った」 | リンター ≠ コンパイラ |
| 「エージェントが成功と言った」 | 独立して検証してください |
| 「疲れている」 | 疲労 ≠ 言い訳 |
| 「部分的なチェックで十分」 | 部分的なものは何も証明しません |
| 「言葉が違うからルールは当てはまらない」 | 文言より精神 |

## 主なパターン

**テスト:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**リグレッションテスト（TDD の Red-Green）:**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**ビルド:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**要件:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**エージェントへの委任:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## 適用するとき

**次の前には常に:**
- 成功・完了を主張する、あらゆる言い方
- 満足を表す、あらゆる表現
- 作業の状態について肯定的に述べる、あらゆる発言
- コミット、PR 作成、タスクの完了
- 次のタスクへの移行
- エージェントへの委任

**このルールが適用されるもの:**
- 正確な言い回し
- 言い換えと類義語
- 成功を示唆する含み
- 完了/正しさをうかがわせる、あらゆるコミュニケーション
