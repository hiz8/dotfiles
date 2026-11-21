# Session diagnosis: <session-id>

Report path: ~/.superpowers/diagnosing-superpowers/<session-id>/report.md
Written: <ISO timestamp>

## 1. Problem statement (REQUIRED)

<case ファイルからコピーする。>

## 2. Triage verdict (REQUIRED)

<報告された問題の前後で、証拠から何が起きたと言えるか。散文で書き、すべての主張の後に `path:line` を付ける。確信度を high / medium / low で述べ、何があればそれが上がるかも述べる。superpowers が何をすべきかについては述べない。>

## 3. Environment (REQUIRED)

- OS:
- Harness and version:
- Models seen:
- Superpowers install root / version / git sha:
- Skill files read or injected (sha1 table from the case file):
- Other plugins, extensions, MCP servers:
- Instruction files present (paths only):

すべての環境フィールドとスキルの観測に、historical evidence、unverified snapshot、current observation、unknown のいずれかのラベルを付け、裏付けとなる証拠の位置を記録します。

## 4. Sessions examined (REQUIRED)

| Role | Session id | Absolute path | Lines | Bytes |
|---|---|---|---|---|

Rejected candidates: <id — path — 理由>、または "none"。

## 5. Timeline (REQUIRED)

人間が入力したプロンプトごとに 1 行。Events 列には、呼び出されたスキル、ディスパッチされた subagent、compaction、エラー、再開、中断を列挙します。

| Turn | Line | Time | Request (one line) | Events |
|---|---|---|---|---|

## 6. Findings (REQUIRED, one subsection per dimension)

各指摘:
```
- finding: <1 文>
  evidence: <path:line> — "<短い引用>"
  turns: <first>–<last>
  confidence: high | medium | low
```
報告すべきことがない観点には `none found — checked: <確認したこと>` と書きます。

### 6.1 Skill timeline
### 6.2 Plan adherence
### 6.3 Repeated work
### 6.4 Stumbles
### 6.5 Quality evidence
### 6.6 Request conflicts
### 6.7 Cost and time
### 6.8 Other plugins and skills used

## 7. Superpowers involvement (REQUIRED)

not indicated | possible | likely

Evidence lines: <path:line の一覧>。このセクションは関与の有無だけを述べます。欠陥を名指ししたり、変更を提案したりしてはいけません。

## 8. Coverage notes (REQUIRED)

- Not read: <範囲、ファイル、その理由>
- Harness features unavailable: <一覧、または none>
- Session was in progress at read time: yes/no
- For your human partner to double-check: <一覧、または none>

## 9. Similar sessions (only when requested)

| Session id | Path | Date | Harness | Matched | Did not match |
|---|---|---|---|---|---|
