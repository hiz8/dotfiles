// commit スキルの検証ツール (scripts/check-commit-message.mjs) のテスト。
//
//   node --test test/check-commit-message.test.mjs

import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { checkMessage } from "../scripts/lib/commit-message.mjs"

// git hook 経由で実行されても、呼び出し元の repo を見ないようにする。
for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) delete process.env[key]
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }

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

// --- タイトル長の目安と subject の上限 ---

test("title over guide warns but passes", () => {
  const r = checkMessage("feat: " + "あ".repeat(51) + "\n")
  assert.deepEqual(r.errors, [])
  assert.equal(r.warnings.length, 1)
  assert.ok(r.warnings[0].msg.includes("目安の 50 文字"), r.warnings[0].msg)
  assert.ok(r.warnings[0].msg.includes("51 文字"), r.warnings[0].msg)
})

test("title within guide has no warning", () => {
  const r = checkMessage("feat: " + "あ".repeat(50))
  assert.deepEqual(r.warnings, [])
})

test("subject at 72 passes, 73 fails", () => {
  const ok = checkMessage("feat: " + "あ".repeat(66))
  assert.deepEqual(ok.errors, [])
  const ng = checkMessage("feat: " + "あ".repeat(67))
  assert.ok(hasMsg(ng, "subject が 72 文字を超えています (73 文字)"), JSON.stringify(ng.errors))
})

test("issue number counts toward subject limit", () => {
  const r = checkMessage("feat: " + "あ".repeat(61) + " #1234")
  assert.ok(hasMsg(r, "subject が 72 文字を超えています (73 文字)"), JSON.stringify(r.errors))
  assert.equal(r.warnings.length, 1)
})

test("empty message has no warnings", () => {
  assert.deepEqual(checkMessage("").warnings, [])
})

// --- 拡張の接頭辞 (options.prefix) ---

const PREFIX = {
  re: /^(?:(\[[^\[\]]+\])+ )/u,
  error: "接頭辞 [ラベル] がありません",
  example: "[設定画面] 保存ボタンを修正",
}
const withPrefix = (raw, prefix = PREFIX) => checkMessage(raw, { prefix })

test("prefix: passes a labeled subject", () => {
  const r = withPrefix("[設定画面][モバイル] 保存ボタンを修正 #12\n\n- 本文")
  assert.deepEqual(r.errors, [])
})

test("prefix: rejects a typed subject", () => {
  const r = withPrefix("feat: 追加\n\n- 本文")
  assert.ok(r.errors.length >= 1)
  assert.ok(hasMsg(r, PREFIX.error), JSON.stringify(r.errors))
  assert.ok(hasMsg(r, "(例: [設定画面] 保存ボタンを修正)"), JSON.stringify(r.errors))
  assert.ok(!hasMsg(r, "コミット種別プレフィックス"), JSON.stringify(r.errors))
})

test("prefix: title length excludes prefix", () => {
  const warn = withPrefix("[設定画面] " + "あ".repeat(51))
  assert.deepEqual(warn.errors, [])
  assert.equal(warn.warnings.length, 1)
  const ng = withPrefix("[設定画面] " + "あ".repeat(66))
  assert.ok(hasMsg(ng, "subject が 72 文字を超えています (73 文字)"), JSON.stringify(ng.errors))
})

test("prefix: empty title after prefix", () => {
  assert.ok(hasMsg(withPrefix("[設定画面] "), "タイトルが空です"))
})

test("prefix: empty match is treated as missing", () => {
  const r = withPrefix("修正", { ...PREFIX, re: /^(?:(\[[^\]]+\])*)/u })
  assert.ok(hasMsg(r, PREFIX.error), JSON.stringify(r.errors))
})

test("prefix: leading space is rejected", () => {
  assert.ok(hasMsg(withPrefix(" [設定画面] 修正"), PREFIX.error))
})

test("prefix: body rules stay common", () => {
  const r = withPrefix(msg("[設定画面] 修正", "", "- " + "あ".repeat(39) + "a"))
  assert.equal(r.errors.length, 1, JSON.stringify(r.errors))
  assert.ok(r.errors[0].msg.includes("表示幅が 80 桁を超えています"))
})

// --- CLI ---

const tmp = mkdtempSync(join(tmpdir(), "commit-check-"))
const noRepo = join(tmp, "no-repo")
mkdirSync(noRepo)
const file = (name, content) => {
  const p = join(tmp, name)
  writeFileSync(p, content)
  return p
}
// 既存の CLI テストがこのリポジトリの状態に左右されないよう、既定は git 外で実行する。
const run = (args, input, cwd = noRepo) =>
  spawnSync(process.execPath, [CLI, ...args], { input, cwd, env: GIT_ENV, encoding: "utf8" })

const makeRepo = (t) => {
  const repo = mkdtempSync(join(tmpdir(), "commit-cli-"))
  t.after(() => rmSync(repo, { recursive: true, force: true }))
  const r = spawnSync("git", ["-C", repo, "init", "-q"], { env: GIT_ENV, encoding: "utf8" })
  assert.equal(r.status, 0, r.stderr)
  return repo
}

const EXT_CONFIG = {
  subjectPrefix: "^(\\[[^\\[\\]]+\\])+ ",
  prefixError: "接頭辞 [ラベル] がありません",
  example: "[設定画面] 保存ボタンを修正",
}

const writeExt = (root, { config = true } = {}) => {
  const dir = join(root, ".claude", "commit")
  mkdirSync(dir, { recursive: true })
  if (config) {
    writeFileSync(join(dir, "config.json"), JSON.stringify(EXT_CONFIG))
    writeFileSync(join(dir, "prefix-guide.md"), "# 接頭辞ガイド\n")
  }
  return dir
}

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

test("cli: warning only exits 0", () => {
  const r = run([file("warn.txt", "feat: " + "あ".repeat(51) + "\n\n- 本文\n")])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^OK: /)
  assert.ok(r.stderr.includes("注意が 1 件あります:"), r.stderr)
})

test("cli: errors and warnings", () => {
  const r = run([file("err-warn.txt", "feat: " + "あ".repeat(51) + "\n- 本文\n")])
  assert.equal(r.status, 1)
  const errAt = r.stderr.indexOf("規約違反が")
  const warnAt = r.stderr.indexOf("注意が 1 件あります:")
  assert.ok(errAt >= 0 && warnAt > errAt, r.stderr)
})

test("cli: show-rules without extension", () => {
  const r = run(["--show-rules"])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout, "規約: 共通規約\n")
})

test("cli: show-rules with extension", (t) => {
  const repo = makeRepo(t)
  writeExt(repo)
  const r = run(["--show-rules"], undefined, repo)
  assert.equal(r.status, 0, r.stderr)
  assert.ok(r.stdout.includes("規約: 拡張 "), r.stdout)
  assert.ok(r.stdout.includes("接頭辞ガイド: "), r.stdout)
  assert.ok(r.stdout.includes("prefix-guide.md"), r.stdout)
})

test("cli: uses extension prefix", (t) => {
  const repo = makeRepo(t)
  writeExt(repo)
  const ng = run([], "feat: 追加\n\n- 本文\n", repo)
  assert.equal(ng.status, 1)
  assert.ok(ng.stderr.includes(EXT_CONFIG.prefixError), ng.stderr)
  const ok = run([], "[設定画面] 保存ボタンを修正\n\n- 本文\n", repo)
  assert.equal(ok.status, 0, ok.stderr)
})

test("cli: broken extension exits 2", (t) => {
  const repo = makeRepo(t)
  writeExt(repo, { config: false })
  for (const args of [["--show-rules"], []]) {
    const r = run(args, "[設定画面] 修正\n", repo)
    assert.equal(r.status, 2, r.stderr)
    assert.ok(r.stderr.includes("拡張の設定を読み込めませんでした"), r.stderr)
  }
})
