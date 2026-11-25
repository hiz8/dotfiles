// commit スキルのリポジトリ別拡張: subject の接頭辞の定義をリポジトリ側から読み込む。
//
// 拡張ディレクトリは git config の commit-skill.extensionDir で指定する。特定の
// ツール名 (.claude など) に縛られず、--local の設定はメインと全 worktree で
// 共有される。相対パスはメインの作業ツリーのルートから解決する (git 管理外の
// 個人用ファイルは linked worktree に入らないため)。設定がなければ拡張なしとし、
// 既定のディレクトリを暗黙に探すことはしない。
//
// 拡張ディレクトリが存在するのに設定が壊れている場合は ExtensionError を投げる。
// 黙って共通規約に戻ると、拡張の接頭辞が必要なリポジトリで誤った形式のまま
// コミットされてしまうため。Node 標準ライブラリ以外に依存しない。

import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

export const CONFIG_KEY = "commit-skill.extensionDir"
export const CONFIG_FILE = "config.json"
export const DEFAULT_GUIDE = "prefix-guide.md"
const REQUIRED_KEYS = ["subjectPrefix", "prefixError", "example"]

export class ExtensionError extends Error {
  constructor(message) {
    super(message)
    this.name = "ExtensionError"
  }
}

const git = (cwd, args) => spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" })

// 相対パスの基準になるメインの作業ツリーのルート。git 外なら null。
function mainRoot(cwd) {
  const r = git(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"])
  if (r.status !== 0) return null
  const [toplevel, commonDir] = r.stdout.split("\n")
  return commonDir && basename(commonDir) === ".git" ? dirname(commonDir) : toplevel
}

const isNonEmptyString = (v) => typeof v === "string" && v !== ""

function loadExtension(dir) {
  let stat
  try {
    stat = statSync(dir)
  } catch (err) {
    throw new ExtensionError(`${dir} を参照できません: ${err.message}`)
  }
  if (!stat.isDirectory()) {
    throw new ExtensionError(`${dir} がディレクトリではありません`)
  }
  const configPath = join(dir, CONFIG_FILE)
  let config
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"))
  } catch (err) {
    throw new ExtensionError(`${configPath} を読み込めません: ${err.message}`)
  }
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new ExtensionError(`${configPath} のトップレベルはオブジェクトにしてください`)
  }
  for (const key of REQUIRED_KEYS) {
    if (!isNonEmptyString(config[key])) {
      throw new ExtensionError(`${configPath} の ${key} は空でない文字列にしてください`)
    }
  }
  if (config.guide !== undefined && !isNonEmptyString(config.guide)) {
    throw new ExtensionError(`${configPath} の guide は空でない文字列にしてください`)
  }

  let re
  try {
    re = new RegExp(`^(?:${config.subjectPrefix.replace(/^\^/, "")})`, "u")
  } catch (err) {
    throw new ExtensionError(`${configPath} の subjectPrefix が正規表現として不正です: ${err.message}`)
  }

  const guidePath = join(dir, config.guide ?? DEFAULT_GUIDE)
  if (!existsSync(guidePath)) {
    throw new ExtensionError(`接頭辞ガイド ${guidePath} がありません`)
  }

  return { dir, guidePath, prefix: { re, error: config.prefixError, example: config.example } }
}

// cwd のリポジトリの git config から拡張を読み込む。設定がない・git 外なら null。
// 存在の判定は lstat で行い、リンク先のないシンボリックリンクも「存在する」とみなす
// (黙って共通規約へ戻らないため)。
export function findExtension(cwd) {
  const root = mainRoot(cwd)
  if (!root) return null
  const r = git(cwd, ["config", "--type=path", "--get", CONFIG_KEY])
  if (r.status === 1) return null
  if (r.status !== 0) {
    throw new ExtensionError(`git config ${CONFIG_KEY} を読み込めません: ${r.stderr.trim()}`)
  }
  const value = r.stdout.replace(/\n$/, "")
  if (value === "") throw new ExtensionError(`git config ${CONFIG_KEY} が空です`)
  const dir = resolve(root, value)
  if (!lstatSync(dir, { throwIfNoEntry: false })) {
    throw new ExtensionError(`${dir} がありません (${CONFIG_KEY})`)
  }
  return loadExtension(dir)
}
