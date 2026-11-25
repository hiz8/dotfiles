// commit スキルの検証ツール (scripts/check-commit-message.mjs) のテスト。
//
//   node --test test/check-commit-message.test.mjs

import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { checkMessage } from "../scripts/lib/commit-message.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const CLI = join(HERE, "..", "scripts", "check-commit-message.mjs")

const msg = (...lines) => lines.join("\n")
const withBody = (...body) => msg("feat: 追加", "", ...body)
const hasMsg = (result, part) => result.errors.some((e) => e.msg.includes(part))

// --- 規約の各 [機械] ルールの基本ケース ---

test("passes a valid message", () => {
  const r = checkMessage(
    msg(
      "feat: ユーザー認証を追加 #12",
      "",
      "- ログイン画面で入力された認証トークンの正当性を検証する処理を追加",
      "- セッション期限切れ時に再ログインを促す導線を整備",
    ),
  )
  assert.deepEqual(r.errors, [])
  assert.equal(r.empty, false)
})

const violations = [
  {
    name: "missing type prefix",
    raw: msg("認証トークンの検証を追加", "", "- 認証トークンの正当性を検証する処理を追加"),
    part: "コミット種別プレフィックスがありません",
  },
  {
    name: "disallowed type perf",
    raw: msg("perf: トークン検証の速度を改善", "", "- 検証処理のキャッシュを追加"),
    part: "コミット種別プレフィックスがありません",
  },
  {
    name: "title over 50 code points",
    raw: msg("feat: " + "あ".repeat(51) + " #123", "", "- 変更内容の説明"),
    part: "タイトルが 50 文字を超えています",
  },
  {
    name: "no blank line after subject",
    raw: msg("feat: 認証トークンの検証を追加", "- 認証トークンの正当性を検証する処理を追加"),
    part: "subject の直後には空行が必要です",
  },
  {
    name: "body line wider than 80 columns",
    raw: msg("feat: 認証処理を追加", "", "- " + "あ".repeat(40)),
    part: "表示幅が 80 桁を超えています",
  },
  {
    name: "early wrap",
    raw: msg(
      "feat: 認証処理を追加",
      "",
      "- 認証トークンの正当性を検証し",
      "  期限切れ時は再ログインへ誘導する",
    ),
    part: "早すぎる改行です",
  },
  {
    name: "decoration",
    raw: msg("feat: 認証処理を追加", "", "- **重要** な認証トークンの検証処理を追加"),
    part: "禁止された装飾",
  },
  {
    name: "co-authored-by trailer",
    raw: msg(
      "feat: 認証処理を追加",
      "",
      "- 認証トークンの検証処理を追加",
      "",
      "Co-Authored-By: Someone <someone@example.com>",
    ),
    part: "Co-Authored-By トレーラーは禁止です",
  },
]

for (const v of violations) {
  test(`rejects: ${v.name}`, () => {
    const r = checkMessage(v.raw)
    assert.ok(hasMsg(r, v.part), JSON.stringify(r.errors))
  })
}

// --- 追加のケース ---

test("empty title", () => {
  for (const raw of ["feat: \n", "feat:    \n"]) {
    const r = checkMessage(raw)
    assert.ok(hasMsg(r, "タイトルが空です"), JSON.stringify(r.errors))
  }
})

test("scope and breaking are rejected", () => {
  for (const raw of ["feat(scope): x\n", "feat!: x\n"]) {
    const r = checkMessage(raw)
    assert.ok(hasMsg(r, "コミット種別プレフィックスがありません"), JSON.stringify(r.errors))
  }
})

test("early wrap: long ascii word", () => {
  const r = checkMessage(withBody("- " + "a".repeat(66), "  " + "b".repeat(12)))
  assert.deepEqual(r.errors, [])
})

test("early wrap: sentence end", () => {
  const r = checkMessage(withBody("- " + "あ".repeat(28) + "。", "  あいう"))
  assert.deepEqual(r.errors, [])
})

test("early wrap: next is list item", () => {
  const r = checkMessage(withBody("- " + "あ".repeat(29), "- 次の項目"))
  assert.deepEqual(r.errors, [])
})

test("early wrap: next is blank", () => {
  const r = checkMessage(withBody("- " + "あ".repeat(29), "", "- 次の項目"))
  assert.deepEqual(r.errors, [])
})

test("ignores comment lines", () => {
  const r = checkMessage(msg("feat: 追加", "# comment", "", "- " + "あ".repeat(40)))
  assert.equal(r.errors.length, 1, JSON.stringify(r.errors))
  assert.equal(r.errors[0].n, 4)
})

test("subject only passes", () => {
  const r = checkMessage("feat: 追加\n")
  assert.deepEqual(r.errors, [])
  assert.equal(r.empty, false)
})

test("subject only without trailing newline passes", () => {
  const r = checkMessage("feat: 追加")
  assert.deepEqual(r.errors, [])
  assert.equal(r.empty, false)
})

test("crlf", () => {
  const r = checkMessage(["feat: 追加", "", "- " + "あ".repeat(39)].join("\r\n") + "\r\n")
  assert.deepEqual(r.errors, [])
})

test("empty message", () => {
  for (const raw of ["", "# only comment\n"]) {
    const r = checkMessage(raw)
    assert.equal(r.empty, true)
    assert.deepEqual(r.errors, [])
  }
})

// --- CLI ---

const tmp = mkdtempSync(join(tmpdir(), "commit-check-"))
const file = (name, content) => {
  const p = join(tmp, name)
  writeFileSync(p, content)
  return p
}
const run = (args, input) =>
  spawnSync(process.execPath, [CLI, ...args], { input, encoding: "utf8" })

const VALID = "feat: 追加\n\n- 変更内容の説明\n"
const INVALID = "認証トークンの検証を追加\n"

test("cli: valid file exits 0", () => {
  const r = run([file("ok.txt", VALID)])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^OK: /)
})

test("cli: invalid file exits 1", () => {
  const r = run([file("ng.txt", INVALID)])
  assert.equal(r.status, 1)
  assert.ok(r.stderr.includes("行"), r.stderr)
})

test("cli: empty message exits 1", () => {
  const r = run([file("empty.txt", "")])
  assert.equal(r.status, 1)
  assert.ok(r.stderr.includes("コミットメッセージが空です。"), r.stderr)
})

test("cli: missing file exits 2", () => {
  const r = run([join(tmp, "does-not-exist.txt")])
  assert.equal(r.status, 2)
})

test("cli: stdin", () => {
  const r = run([], INVALID)
  assert.equal(r.status, 1)
})

test("cli: verbose", () => {
  const r = run(["--verbose", file("ok-verbose.txt", VALID)])
  assert.equal(r.status, 0, r.stderr)
  assert.ok(r.stderr.includes("--- 表示幅一覧 ---"), r.stderr)
})
