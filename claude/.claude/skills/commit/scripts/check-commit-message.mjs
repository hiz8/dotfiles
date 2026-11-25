#!/usr/bin/env node
// commit スキルの検証ツール: コミットメッセージを規約の [機械] ルールで検証する。
//
// 判定は lib/commit-message.mjs の checkMessage が行う。このスクリプトは入力の
// 読み込み・出力・終了コードだけを持つ。Node 標準ライブラリ以外に依存しない。
//
// 使い方:
//   node [SKILL_DIR]/scripts/check-commit-message.mjs [--verbose] <message-file>
//   echo "$msg" | node [SKILL_DIR]/scripts/check-commit-message.mjs
//   --verbose を付けると全行の表示幅一覧を stderr に出す
//   node [SKILL_DIR]/scripts/check-commit-message.mjs --show-rules
//   --show-rules は使う規約 (共通規約か拡張か) と接頭辞ガイドのパスを stdout に出す。
//   メッセージの入力は読まず、--verbose は無視する
//
// 作業ディレクトリから lib/extension.mjs の findExtension でリポジトリ別拡張を
// 探し、見つかれば subject の接頭辞をその定義で判定する。
//
// 終了コード: 0 = 合格、1 = 違反あり (空メッセージを含む)、
// 2 = 入力または拡張の設定を読めない。
// 注意 (タイトルが目安の文字数を超えた場合など) は終了コードに影響せず stderr に出す。
// 機械判定できないルール (Why→What の順序、です・ます調禁止など) は
// references/commit-rules.md を参照し、エージェントが自己チェックする。

import { readFileSync } from "node:fs"
import { checkMessage, displayWidth } from "./lib/commit-message.mjs"
import { ExtensionError, findExtension } from "./lib/extension.mjs"

function readInput() {
  const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"))
  try {
    return readFileSync(fileArg ?? 0, "utf8")
  } catch (err) {
    const src = fileArg ? `ファイル ${fileArg}` : "標準入力"
    console.error(`${src} を読み込めませんでした: ${err.message}`)
    process.exit(2)
  }
}

function loadExtension() {
  try {
    return findExtension(process.cwd())
  } catch (err) {
    if (!(err instanceof ExtensionError)) throw err
    console.error(`拡張の設定を読み込めませんでした: ${err.message}`)
    process.exit(2)
  }
}

function showRules(extension) {
  if (!extension) {
    console.log("規約: 共通規約")
  } else {
    console.log(`規約: 拡張 ${extension.dir}`)
    console.log(`接頭辞ガイド: ${extension.guidePath}`)
  }
  process.exit(0)
}

function printWarnings(warnings) {
  if (warnings.length === 0) return
  console.error(`注意が ${warnings.length} 件あります:`)
  for (const w of warnings) {
    console.error(`  行${w.n}: ${w.msg}`)
  }
}

function main() {
  const extension = loadExtension()
  if (process.argv.includes("--show-rules")) showRules(extension)

  const verbose = process.argv.includes("--verbose")
  const { empty, errors, warnings, lines } = checkMessage(readInput(), { prefix: extension?.prefix })

  if (verbose) {
    console.error("--- 表示幅一覧 ---")
    for (const { n, text } of lines) {
      console.error(`${String(n).padStart(3)}: ${String(displayWidth(text)).padStart(3)}桁  ${text}`)
    }
    console.error("")
  }

  if (empty) {
    console.error("コミットメッセージが空です。")
    process.exit(1)
  }

  if (errors.length === 0) {
    console.log("OK: コミットメッセージは規約に適合しています。")
    printWarnings(warnings)
    process.exit(0)
  }

  console.error(`コミットメッセージの規約違反が ${errors.length} 件あります:`)
  for (const e of errors) {
    console.error(`  行${e.n} (幅=${e.width}): ${e.msg}`)
  }
  printWarnings(warnings)
  process.exit(1)
}

main()
