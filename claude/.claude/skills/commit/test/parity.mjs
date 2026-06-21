// 旧 check-commit-message.mjs と新 commitlint 構成の合否パリティを検証する。
//
// 各フィクスチャを両実装に通し、PASS/FAIL (exit 0 か否か) が一致するか比較する。
// 新構成では、期待した違反カテゴリ (commitlint のルール名) が出力に現れることも確認する。
// 表示・メッセージ書式は両者で異なるため、比較対象は合否と発火ルールに限る。
//
//   node test/parity.mjs

import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const SKILL = join(HERE, "..")
const OLD = join(SKILL, "check-commit-message.mjs")
const COMMITLINT = join(SKILL, "node_modules", ".bin", "commitlint")
const CONFIG = join(SKILL, "commitlint.config.mjs")

// 全角40文字 = 表示幅80桁。先頭に "- " (半角2) を足すと 82桁 だが文字数は42 (<80)。
const WIDE_OVER = "- " + "あ".repeat(40)

const fixtures = [
  {
    name: "正常系 (合格するメッセージ)",
    shouldPass: true,
    expectRules: [],
    msg: [
      "feat: ユーザー認証を追加 #12",
      "",
      "- ログイン画面で入力された認証トークンの正当性を検証する処理を追加",
      "- セッション期限切れ時に再ログインを促す導線を整備",
    ].join("\n"),
  },
  {
    name: "種別プレフィックス無し",
    shouldPass: false,
    expectRules: ["type-empty"],
    msg: ["認証トークンの検証を追加", "", "- 認証トークンの正当性を検証する処理を追加"].join("\n"),
  },
  {
    name: "許可外の種別 (perf)",
    shouldPass: false,
    expectRules: ["type-enum"],
    msg: ["perf: トークン検証の速度を改善", "", "- 検証処理のキャッシュを追加"].join("\n"),
  },
  {
    name: "タイトル 50 コードポイント超過 (末尾 Issue 番号付き)",
    shouldPass: false,
    expectRules: ["ja-title-max-length"],
    // 種別と末尾 #番号 を除いたタイトルが 51 文字 (>50)。
    msg: ["feat: " + "あ".repeat(51) + " #123", "", "- 変更内容の説明"].join("\n"),
  },
  {
    name: "subject 直後の空行が無い",
    shouldPass: false,
    expectRules: ["body-leading-blank"],
    msg: ["feat: 認証トークンの検証を追加", "- 認証トークンの正当性を検証する処理を追加"].join("\n"),
  },
  {
    name: "全角主体・文字数<80 だが表示幅>80 の本文行 (パリティの要)",
    shouldPass: false,
    expectRules: ["ja-body-display-width"],
    msg: ["feat: 認証処理を追加", "", WIDE_OVER].join("\n"),
  },
  {
    name: "早すぎる改行",
    shouldPass: false,
    expectRules: ["ja-early-wrap"],
    // 1行目は短く (文末でなく)、次行を繰り上げても80桁以内に収まる継続行。
    msg: [
      "feat: 認証処理を追加",
      "",
      "- 認証トークンの正当性を検証し",
      "  期限切れ時は再ログインへ誘導する",
    ].join("\n"),
  },
  {
    name: "装飾記号 (**) を含む",
    shouldPass: false,
    expectRules: ["ja-no-decoration"],
    msg: ["feat: 認証処理を追加", "", "- **重要** な認証トークンの検証処理を追加"].join("\n"),
  },
  {
    name: "Co-Authored-By を含む",
    shouldPass: false,
    expectRules: ["ja-no-coauthor"],
    msg: [
      "feat: 認証処理を追加",
      "",
      "- 認証トークンの検証処理を追加",
      "",
      "Co-Authored-By: Someone <x@example.com>",
    ].join("\n"),
  },
]

function runOld(file) {
  const r = spawnSync("node", [OLD, file], { encoding: "utf8" })
  return { pass: r.status === 0, out: (r.stdout || "") + (r.stderr || "") }
}

function runNew(file) {
  const r = spawnSync(COMMITLINT, ["--config", CONFIG, "--edit", file], {
    encoding: "utf8",
  })
  return { pass: r.status === 0, out: (r.stdout || "") + (r.stderr || "") }
}

const dir = mkdtempSync(join(tmpdir(), "commit-parity-"))
let failures = 0

console.log("=== コミットメッセージ検証 パリティテスト ===\n")
for (const fx of fixtures) {
  const file = join(dir, "msg.txt")
  writeFileSync(file, fx.msg + "\n", "utf8")

  const oldR = runOld(file)
  const newR = runNew(file)

  const wantPass = fx.shouldPass
  const oldOk = oldR.pass === wantPass
  const newOk = newR.pass === wantPass
  const parity = oldR.pass === newR.pass
  const rulesOk = fx.expectRules.every((rule) => newR.out.includes(rule))

  const ok = oldOk && newOk && parity && rulesOk
  if (!ok) failures++

  const verdict = (p) => (p ? "PASS" : "FAIL")
  console.log(`${ok ? "✓" : "✗"} ${fx.name}`)
  console.log(
    `    期待=${verdict(wantPass)}  旧=${verdict(oldR.pass)}  新=${verdict(newR.pass)}  パリティ=${parity ? "一致" : "不一致"}`,
  )
  if (fx.expectRules.length) {
    console.log(`    発火ルール期待: ${fx.expectRules.join(", ")} -> ${rulesOk ? "OK" : "NG"}`)
  }
  if (!ok) {
    console.log("    --- 新構成の出力 ---")
    console.log(
      newR.out
        .trim()
        .split("\n")
        .map((l) => "    " + l)
        .join("\n"),
    )
  }
  console.log("")
}

rmSync(dir, { recursive: true, force: true })

if (failures) {
  console.error(`結果: ${failures} 件のフィクスチャでパリティ/期待を満たしませんでした。`)
  process.exit(1)
}
console.log("結果: 全フィクスチャで旧実装と合否が一致しました。")
