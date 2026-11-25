// commit スキルのリポジトリ別拡張: subject の接頭辞の定義をリポジトリ側から読み込む。
//
// 拡張ディレクトリは <作業ツリーのルート>/.claude/commit/ で、次の順に探す。
//   1. 今いる作業ツリーのルート (git rev-parse --show-toplevel)
//   2. メインの作業ツリーのルート (git rev-parse --git-common-dir の親)
// git 管理外の個人用ファイルは linked worktree に入らないため、2 でメインの
// 作業ツリーに置いた拡張をどの worktree からでも使えるようにする。
//
// 拡張ディレクトリが存在するのに設定が壊れている場合は ExtensionError を投げる。
// 黙って共通規約に戻ると、拡張の接頭辞が必要なリポジトリで誤った形式のまま
// コミットされてしまうため。Node 標準ライブラリ以外に依存しない。

import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"

export const EXTENSION_DIR = join(".claude", "commit")
export const CONFIG_FILE = "config.json"
export const DEFAULT_GUIDE = "prefix-guide.md"
const REQUIRED_KEYS = ["subjectPrefix", "prefixError", "example"]

export class ExtensionError extends Error {
  constructor(message) {
    super(message)
    this.name = "ExtensionError"
  }
}

// 拡張ディレクトリの候補 (作業ツリーのルート) を探す順に返す。git 外なら空配列。
function candidateRoots(cwd) {
  const r = spawnSync(
    "git",
    ["-C", cwd, "rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"],
    { encoding: "utf8" },
  )
  if (r.status !== 0) return []
  const [toplevel, commonDir] = r.stdout.split("\n")
  const roots = [toplevel]
  if (commonDir && basename(commonDir) === ".git") roots.push(dirname(commonDir))
  return [...new Set(roots.filter(Boolean))]
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

// cwd から拡張を探して読み込む。見つからなければ null。
// 存在の判定は lstat で行い、リンク先のないシンボリックリンクも「存在する」とみなす
// (黙って次の候補や共通規約へ回り込まないため)。
export function findExtension(cwd) {
  for (const root of candidateRoots(cwd)) {
    const dir = join(root, EXTENSION_DIR)
    if (lstatSync(dir, { throwIfNoEntry: false })) return loadExtension(dir)
  }
  return null
}
