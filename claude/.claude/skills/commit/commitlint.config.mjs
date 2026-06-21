// commit スキル専用 commitlint 設定。
//
// 基本的な構造は config-conventional の標準ルールに委ね、日本語特有の独自ルールは
// ローカルプラグイン (commitlint-plugin-ja.mjs) で補う。
// config-conventional 由来の標準ルールのエラーは英語、ローカルルールは日本語で出る。

import conventional from "@commitlint/config-conventional"
import jaPlugin from "./commitlint-plugin-ja.mjs"

export default {
  ...conventional,
  plugins: [...(conventional.plugins ?? []), jaPlugin],
  rules: {
    ...conventional.rules,

    // --- config-conventional の標準ルールを本リポジトリ向けに上書き ---
    // 許可種別を 6 種に限定し、種別プレフィックスを必須化する。
    "type-enum": [2, "always", ["feat", "fix", "docs", "refactor", "test", "chore"]],
    "type-empty": [2, "never"],
    // subject は非空。
    "subject-empty": [2, "never"],
    // subject 直後の空行を必須化 (config-conventional 既定は警告=1 のため 2 へ引き上げ)。
    "body-leading-blank": [2, "always"],

    // --- スコープ外の標準ルールを無効化 ---
    // 旧 check-commit-message.mjs に無いルールで現行で通るメッセージを新たに弾かないため、
    // および表示幅は文字数ではなくローカルの表示桁ルールで判定するため。
    "subject-case": [0],
    "subject-full-stop": [0],
    "type-case": [0],
    "scope-case": [0],
    "scope-empty": [0],
    "header-max-length": [0],
    "header-trim": [0],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "footer-leading-blank": [0],
    "body-full-stop": [0],

    // --- ローカル (日本語特有) ルール ---
    "ja-title-max-length": [2, "always"],
    "ja-body-display-width": [2, "always"],
    "ja-early-wrap": [2, "always"],
    "ja-no-decoration": [2, "always"],
    "ja-no-coauthor": [2, "always"],
  },
}
