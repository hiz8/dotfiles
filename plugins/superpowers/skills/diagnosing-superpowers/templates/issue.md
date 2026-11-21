Title: <skill or symptom>: <one-line observable> (<harness>)

- [x] I searched existing issues and this is not a duplicate (searched: <query terms>; closest: <#n title, or "none">)

## Who's filing this report? (required)

<このセッションのモデルとハーネス>, filing on behalf of <パートナーが名乗りたい名前、または "my human partner">, who asked: "<診断または issue につながった、このセッションでのパートナーの依頼。スクラブ済みのもの>"

## Human-authored summary (required, under 200 words)

<何がうまくいかなかったか、何が起きるべきだったかについての、パートナー自身の言葉を、書かれたとおりに貼り付けてください。パートナーに尋ねてください。ここがプレースホルダのままなら、issue は提出できる状態ではありません。長すぎる場合は、パートナーの言葉を編集せず、パートナーに短くするよう頼んでください。>

## Environment (required)

| Field | Value | Provenance / supporting evidence |
|-------|-------|-------------------------------|
| Superpowers version | <version> (<sha or "not a checkout">) | <historical evidence / unverified snapshot / current observation / unknown>; <location> |
| Harness (Claude Code, Cursor, etc.) | <harness> | <label>; <location> |
| Harness version | <version> | <label>; <location> |
| Your model + version | <model ids seen> | <label>; <location> |
| All plugins installed | <list> | <label>; <location> |
| OS + shell | <os version>, <shell> | <label>; <location> |

## Is this a Superpowers issue or a platform issue?

- [ ] I confirmed this issue does not occur without Superpowers installed

How I verified that this issue does not reproduce without Superpowers:
<"Not tried"、または、パートナーが superpowers なしで何を実行して何が起きたか（トランスクリプトがあればそのパスも）。上のチェックボックスにチェックを入れるのは、問題が再発しなかったことをトランスクリプトが示している場合だけです。>

Evidence for involvement is below; it does not establish cause.

## What happened?

<問題の記述、続けてトリアージの判定。`path:line` の引用は `transcript line <n>` に書き換えてください。>

## Steps to reproduce

1. <スクラブ済みの、最初の人間のプロンプト>
2. <問題に至るまでのターン。1 ターン 1 行>
3. <観測された事象>

## Expected behavior

<問題の記述から>

## Actual behavior

<トリアージの判定から>

## Debug log or conversation transcript

Session id(s): <ids>. Delivered local archive: <path, redaction level <level>
| none built>. Attached bundle: <no claim; attach only after approval>.
Superpowers involvement per the diagnosis report: <possible | likely>, with
evidence at <transcript lines>. This report does not propose a fix.

---
Filed with the `diagnosing-superpowers` skill. The filing model and
harness are under "Who's filing"; the diagnosed session's model, harness,
versions, and plugins are in the Environment table.
