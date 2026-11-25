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
// ユーザーのグローバル git 設定 (commit-skill.extensionDir を含む) にも左右されない
// ようにする。in-process の findExtension と子プロセスの両方に効かせる。
for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) delete process.env[key]
process.env.GIT_CONFIG_GLOBAL = "/dev/null"
process.env.GIT_CONFIG_NOSYSTEM = "1"
const GIT_ENV = { ...process.env }

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

// 拡張ディレクトリ dir に config.json と接頭辞ガイドを書く。
const writeExt = (dir, config = VALID, { guide = true } = {}) => {
  mkdirSync(dir, { recursive: true })
  if (config !== null) {
    const text = typeof config === "string" ? config : JSON.stringify(config)
    writeFileSync(join(dir, "config.json"), text)
  }
  if (guide) writeFileSync(join(dir, "prefix-guide.md"), "# 接頭辞ガイド\n")
  return dir
}

const setExtDir = (repo, value) =>
  git("-C", repo, "config", "--local", "commit-skill.extensionDir", value)

// repo/ext に拡張を書き、設定する。
const configuredExt = (repo, ...args) => {
  setExtDir(repo, "ext")
  return writeExt(join(repo, "ext"), ...args)
}

const real = (p) => realpathSync(p)

test("returns null outside a git repository", (t) => {
  assert.equal(findExtension(tempDir(t)), null)
})

test("returns null when not configured", (t) => {
  assert.equal(findExtension(makeRepo(t)), null)
})

test("does not look for an implicit directory", (t) => {
  const root = makeRepo(t)
  writeExt(join(root, ".claude", "commit"))
  assert.equal(findExtension(root), null)
})

test("finds configured relative directory from a subdirectory", (t) => {
  const root = makeRepo(t)
  const dir = writeExt(join(root, ".claude", "docs", "commit"))
  setExtDir(root, ".claude/docs/commit")
  const sub = join(root, "src", "a")
  mkdirSync(sub, { recursive: true })
  const ext = findExtension(sub)
  assert.equal(real(ext.dir), real(dir))
  assert.ok(ext.guidePath.endsWith("prefix-guide.md"), ext.guidePath)
  assert.equal(ext.prefix.re.test("[設定画面] 修正"), true)
  assert.equal(ext.prefix.error, VALID.prefixError)
  assert.equal(ext.prefix.example, VALID.example)
})

test("resolves relative directory against the main worktree", (t) => {
  const root = makeRepo(t)
  const dir = configuredExt(root)
  const wt = addWorktree(t, root)
  assert.equal(real(findExtension(wt).dir), real(dir))
})

test("accepts an absolute directory", (t) => {
  const root = makeRepo(t)
  const dir = writeExt(join(tempDir(t), "outside"))
  setExtDir(root, dir)
  assert.equal(real(findExtension(root).dir), real(dir))
})

test("throws when configured directory is missing", (t) => {
  const root = makeRepo(t)
  setExtDir(root, "does-not-exist")
  assert.throws(() => findExtension(root), ExtensionError)
})

test("anchors a pattern without caret", (t) => {
  const root = makeRepo(t)
  configuredExt(root, { ...VALID, subjectPrefix: "\\[x\\] " })
  const { re } = findExtension(root).prefix
  assert.equal(re.test("a [x] b"), false)
  assert.equal(re.test("[x] b"), true)
})

test("uses custom guide name", (t) => {
  const root = makeRepo(t)
  const dir = configuredExt(root, { ...VALID, guide: "labels.md" }, { guide: false })
  writeFileSync(join(dir, "labels.md"), "# labels\n")
  assert.ok(findExtension(root).guidePath.endsWith("labels.md"))
})

const broken = [
  { name: "no config.json", setup: (root) => configuredExt(root, null) },
  { name: "invalid json", setup: (root) => configuredExt(root, "{") },
  { name: "top-level null", setup: (root) => configuredExt(root, "null") },
  { name: "top-level array", setup: (root) => configuredExt(root, "[]") },
  ...["subjectPrefix", "prefixError", "example"].map((key) => ({
    name: `missing ${key}`,
    setup: (root) => {
      const config = { ...VALID }
      delete config[key]
      configuredExt(root, config)
    },
  })),
  { name: "subjectPrefix not a string", setup: (root) => configuredExt(root, { ...VALID, subjectPrefix: 1 }) },
  { name: "subjectPrefix empty", setup: (root) => configuredExt(root, { ...VALID, subjectPrefix: "" }) },
  { name: "guide not a string", setup: (root) => configuredExt(root, { ...VALID, guide: 123 }) },
  { name: "invalid regex", setup: (root) => configuredExt(root, { ...VALID, subjectPrefix: "([" }) },
  { name: "guide missing", setup: (root) => configuredExt(root, VALID, { guide: false }) },
  {
    name: "extension path is a broken symlink",
    setup: (root) => {
      setExtDir(root, "ext")
      symlinkSync(join(root, "missing"), join(root, "ext"))
    },
  },
  {
    name: "extension path is a file",
    setup: (root) => {
      setExtDir(root, "ext")
      writeFileSync(join(root, "ext"), "")
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
