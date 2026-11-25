// commit スキルのリポジトリ別拡張 (scripts/lib/extension.mjs) のテスト。
//
//   node --test test/extension.test.mjs

import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { ExtensionError, findExtension } from "../scripts/lib/extension.mjs"

// git hook 経由で実行されても、呼び出し元の repo を見ないようにする。
for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) delete process.env[key]
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }

const git = (...args) => {
  const r = spawnSync("git", args, { env: GIT_ENV, encoding: "utf8" })
  assert.equal(r.status, 0, r.stderr)
}

const tempDir = (t) => {
  const dir = mkdtempSync(join(tmpdir(), "commit-ext-"))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

const makeRepo = (t) => {
  const repo = tempDir(t)
  git("-C", repo, "init", "-q")
  git("-C", repo, "-c", "user.name=t", "-c", "user.email=t@example.com",
    "commit", "-q", "--allow-empty", "-m", "init")
  return repo
}

let wtCount = 0
const addWorktree = (t, repo) => {
  const wt = join(tempDir(t), "wt")
  git("-C", repo, "worktree", "add", "-q", wt, "-b", `wt-${++wtCount}`)
  return wt
}

const VALID = {
  subjectPrefix: "^(\\[[^\\[\\]]+\\])+ ",
  prefixError: "接頭辞 [ラベル] がありません",
  example: "[設定画面] 保存ボタンを修正",
}

const writeExt = (root, config = VALID, { guide = true } = {}) => {
  const dir = join(root, ".claude", "commit")
  mkdirSync(dir, { recursive: true })
  if (config !== null) {
    const text = typeof config === "string" ? config : JSON.stringify(config)
    writeFileSync(join(dir, "config.json"), text)
  }
  if (guide) writeFileSync(join(dir, "prefix-guide.md"), "# 接頭辞ガイド\n")
  return dir
}

const real = (p) => realpathSync(p)

test("returns null outside a git repository", (t) => {
  assert.equal(findExtension(tempDir(t)), null)
})

test("returns null when no extension directory", (t) => {
  assert.equal(findExtension(makeRepo(t)), null)
})

test("finds extension from a subdirectory", (t) => {
  const root = makeRepo(t)
  writeExt(root)
  const sub = join(root, "src", "a")
  mkdirSync(sub, { recursive: true })
  const ext = findExtension(sub)
  assert.equal(real(ext.dir), real(join(root, ".claude", "commit")))
  assert.ok(ext.guidePath.endsWith("prefix-guide.md"), ext.guidePath)
  assert.equal(ext.prefix.re.test("[設定画面] 修正"), true)
  assert.equal(ext.prefix.error, VALID.prefixError)
  assert.equal(ext.prefix.example, VALID.example)
})

test("finds main worktree extension from a linked worktree", (t) => {
  const root = makeRepo(t)
  writeExt(root)
  const wt = addWorktree(t, root)
  const ext = findExtension(wt)
  assert.equal(real(ext.dir), real(join(root, ".claude", "commit")))
})

test("prefers the current worktree extension", (t) => {
  const root = makeRepo(t)
  writeExt(root)
  const wt = addWorktree(t, root)
  writeExt(wt, { ...VALID, example: "[一覧画面] 並び順を修正" })
  const ext = findExtension(wt)
  assert.equal(ext.prefix.example, "[一覧画面] 並び順を修正")
  assert.equal(real(ext.dir), real(join(wt, ".claude", "commit")))
})

test("broken worktree extension is not skipped", (t) => {
  const root = makeRepo(t)
  writeExt(root)
  const wt = addWorktree(t, root)
  writeExt(wt, null)
  assert.throws(() => findExtension(wt), ExtensionError)
})

test("anchors a pattern without caret", (t) => {
  const root = makeRepo(t)
  writeExt(root, { ...VALID, subjectPrefix: "\\[x\\] " })
  const { re } = findExtension(root).prefix
  assert.equal(re.test("a [x] b"), false)
  assert.equal(re.test("[x] b"), true)
})

test("uses custom guide name", (t) => {
  const root = makeRepo(t)
  const dir = writeExt(root, { ...VALID, guide: "labels.md" }, { guide: false })
  writeFileSync(join(dir, "labels.md"), "# labels\n")
  assert.ok(findExtension(root).guidePath.endsWith("labels.md"))
})

const broken = [
  { name: "no config.json", setup: (root) => writeExt(root, null) },
  { name: "invalid json", setup: (root) => writeExt(root, "{") },
  { name: "top-level null", setup: (root) => writeExt(root, "null") },
  { name: "top-level array", setup: (root) => writeExt(root, "[]") },
  ...["subjectPrefix", "prefixError", "example"].map((key) => ({
    name: `missing ${key}`,
    setup: (root) => {
      const config = { ...VALID }
      delete config[key]
      writeExt(root, config)
    },
  })),
  { name: "subjectPrefix not a string", setup: (root) => writeExt(root, { ...VALID, subjectPrefix: 1 }) },
  { name: "subjectPrefix empty", setup: (root) => writeExt(root, { ...VALID, subjectPrefix: "" }) },
  { name: "guide not a string", setup: (root) => writeExt(root, { ...VALID, guide: 123 }) },
  { name: "invalid regex", setup: (root) => writeExt(root, { ...VALID, subjectPrefix: "([" }) },
  { name: "guide missing", setup: (root) => writeExt(root, VALID, { guide: false }) },
  {
    name: "extension path is a broken symlink",
    setup: (root) => {
      mkdirSync(join(root, ".claude"), { recursive: true })
      symlinkSync(join(root, "missing"), join(root, ".claude", "commit"))
    },
  },
  {
    name: "extension path is a file",
    setup: (root) => {
      mkdirSync(join(root, ".claude"), { recursive: true })
      writeFileSync(join(root, ".claude", "commit"), "")
    },
  },
]

for (const { name, setup } of broken) {
  test(`throws on broken extension: ${name}`, (t) => {
    const root = makeRepo(t)
    setup(root)
    assert.throws(() => findExtension(root), ExtensionError)
  })
}
