# check-library-upgrade スキル テスト記録

`docs/superpowers/plans/2026-11-27-check-library-upgrade-superpowers-style.md` の書き直しで、
動作が変わっていないことを確かめるための記録。書き直しの前（現行版）と後（新版）で、
同じシナリオを subagent に実行させて比べる。

## フィクスチャ

セッションの scratchpad に作成し、リポジトリには入れない。各フィクスチャは `package.json` を
手で書き、`npm install --ignore-scripts` で `node_modules` と `package-lock.json` を作る。
実行ごとに新しいコピーを使う。

- `s1/`: `dependencies` に `"react": "18.2.0"` だけ。`src/index.js` は `import React from "react";` の 1 行
- `s2/`: `dependencies` に `"react": "18.2.0"` と `"react-dom": "18.2.0"`
  - `src/Button.jsx`: 関数コンポーネント `Button` と `Button.defaultProps = { label: "OK" };`
  - `src/Button.test.jsx`: `import { act } from "react-dom/test-utils";` を使って `Button` を描画するテスト（実行はしない）
- `s3/`: `dependencies` に `"ms": "2.1.2"`。`src/duration.js` に `import ms from "ms"; export const timeout = ms("2 days");`

現行版は `git show master:claude/.claude/skills/check-library-upgrade/SKILL.md` で取り出す。

## 実行方法

シナリオ 1 回につき `general-purpose` の subagent を 1 つディスパッチする。プロンプトは次の文 + 改行 + 依頼文:

```
`<SKILL>` を読み、ユーザーから次の依頼を受けてこのスキルが起動されたものとして従ってください。
この作業では Skill ツールを使ってはいけません（同名のスキルがインストールされていますが、従うのはこのファイルだけです）。
作業ディレクトリは `<DIR>` です。`<DIR>` の外は変更しないでください。
最後に、レポートの全文と、Skill ツールを使ったかどうかを返してください。
```

Skill ツールを使った実行は無効として数えず、やり直す。S1 は 3 回、S2・S3 は 1 回ずつ実行する。
現行版と新版で合否が食い違ったシナリオは、両方の版でさらに 2 回ずつ実行する。

## シナリオ

全シナリオ共通の合格条件: レポートに `- <項目>` がそのまま残っていない、4 セクションの見出しと
タイトル行が現行の書式どおり（S1 はレポートを出さないので対象外）。

| ID | フィクスチャ | 依頼文 | 合格の条件 |
|---|---|---|---|
| S1 | s1 | `zod を 4.6.7 に上げる前に、更新内容を調べてください` | 依存に無いと報告し、新規導入か名前の誤りかを尋ねて止まる。`npm view zod versions` 以降の手順（リリースノートの取得）に進まない |
| S2 | s2 | `react 18.3.1` | 現在 18.2.0・ターゲット 18.3.1 と読み取る。セクション 1 に「`act` を `react` から export」（18.3.1）が載る。セクション 2 に同項目が `src/Button.test.jsx` の使用箇所を添えて載る。セクション 3・4 の本文が `なし` の一語だけ（`defaultProps` などの非推奨化の警告が載らない） |
| S3 | s3 | `ms を最新版に上げたいので、事前に影響を調べてください` | ターゲットに実行時点の `npm view ms dist-tags.latest`（2026-11-27 時点で `2.1.3`）を採用する（`beta` `canary` `nightly` や `versions` の末尾を選ばない）。4 セクションすべての本文が `なし` の一語だけ（改名・依存更新・CI の変更を追加機能に数えない） |

## 結果（現行版）

2026-11-27 に実行。5 件すべて合格。どの実行も Skill ツールを使っていない。

- **S1（3 回とも合格）:** 3 回とも `package.json`・`npm ls zod --depth=0`（`(empty)`）・lockfile・
  ソースを確かめて「依存に含まれていない」と報告し、新規導入か名前の誤りかを尋ねて止まった。
  `npm view` もリリースノートの取得も行っていない
- **S2（合格）:** `18.2.0 → 18.3.1`、対象リリース 18.3.0, 18.3.1。セクション 1 に
  「`act` が `react` から直接 export されるようになった（18.3.1）」、セクション 2 に同項目を
  `src/Button.test.jsx:2` の使用箇所付きで記載。セクション 3・4 は `なし` の一語だけ。
  `defaultProps` の警告はレポートの外の補足でだけ触れた（レポートには入れていない）
- **S3（合格）:** ターゲットに `dist-tags` の `latest`（`2.1.3`）を採用し、beta / canary / nightly
  を除外したと明記。一次情報に GitHub Release 2.1.3 を使い、4 セクションすべて `なし` の一語だけ

## 結果（新版）
