# Case: <session-id>

Workspace: ~/.superpowers/diagnosing-superpowers/<session-id>/
Created: <ISO timestamp>

## Problem statement (agreed with your human partner)

<1 段落。セッション、判明していればターンの範囲、期待されていたこと、実際に起きたこと、重要な観測対象（実時間、トークン、繰り返された操作、予期しない特定の操作）を示す。>

Goal is a superpowers bug report: yes | no

## Sessions

| Role | Session id | Absolute path | Lines | Bytes | Longest line (bytes) | First prompt (first 120 chars) | First timestamp |
|---|---|---|---|---|---|---|---|
| main | | | | | | | |
| subagent | | | | | | | |

Rejected candidates: <id — path — 却下した理由>、または "none"。

Session still running at read time: yes | no (mtime <ISO>, lines <N>)

## Environment

- OS: <名前とバージョン>
- Harness: <name> <version>
- Models seen: <model id — どこで（main / subagent id）>
- Superpowers install root: <path>; version <x.y.z>; git sha <sha or "not a checkout">
- Skill files read or injected during the session:

| Skill / source path | sha1 or unavailable | Provenance | Supporting location |
|---|---|---|---|

環境とスキルの観測には、historical evidence、unverified snapshot、current observation、unknown のいずれかのラベルを付けます。過去の情報が利用できないと宣言する前に、渡された出所（provenance）のメモ、アーカイブ、取得済みのスキル本文を確認してください。元のパスが失われていても、保持されているコピーがなくなるわけではありません。現在のバージョンや mtime は、過去のバージョンを立証しません。取得したスキル本文が 1 つあっても、インストール全体を認証することにはなりません。

- Other plugins / extensions / MCP servers configured: <一覧、または "none found">
- Instruction files present (paths only): <一覧>

## Context-safety rules for every reader of these files

- ここに挙げたファイルを読む前に、`references/context-safety.md` に従ってください。
- subagent のトランスクリプトでは、「user」は親エージェントです。

## Discovered sources and record meanings

- Sources consulted: <絶対パス、ツール、ヘルプ、またはドキュメントのソース>
- Extraction commands or queries: <各ソースに使った、範囲を限定したコマンドまたはツールクエリ>
- Target identity evidence: <セッション id、作業ディレクトリ、タイムスタンプ、一致する内容、裏付けとなるレコードの位置>
- Associated sessions: <セッション id、関係、裏付けとなるレコードの位置、または "none found">
- Human messages: <レコードの形と、その意味の証拠>
- Injected messages and parent dispatches: <レコードの形と、その意味の証拠>
- Assistant messages: <レコードの形と、その意味の証拠>
- Tool calls and results: <レコードの形、対応付けの方法、それらの意味の証拠>
- Usage counters: <フィールド、増分か累積かの意味、単位、証拠、または "unavailable">
- Timing: <フィールド、単位、イベントの境界、証拠、または "unavailable">
- Other relevant records: <モデル、バージョン、compaction、その他の意味と証拠>
- Unresolved information: <欠けている、アクセスできない、曖昧、または存在しない情報、または "none">
