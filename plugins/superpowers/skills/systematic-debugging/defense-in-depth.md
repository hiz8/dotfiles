# 多層防御による検証

## 概要

無効なデータが原因のバグを直すとき、1 か所に検証を追加すれば十分に感じられます。しかし、その 1 つのチェックは、別のコードパス、リファクタリング、モックによって回避されうるものです。

**基本原則:** データが通る**すべての**層で検証してください。そうすれば、バグが構造的に起こり得なくなります。

## なぜ複数の層なのか

単一の検証: 「バグを直した」
複数の層: 「バグを不可能にした」

層ごとに捕まえるケースが異なります:
- 入口の検証は、ほとんどのバグを捕まえる
- ビジネスロジックは、エッジケースを捕まえる
- 環境ガードは、特定のコンテキストに固有の危険を防ぐ
- デバッグログは、他の層が失敗したときに助けになる

## 4 つの層

### 層 1: エントリポイントの検証
**目的:** API の境界で、明らかに無効な入力を拒否する

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### 層 2: ビジネスロジックの検証
**目的:** データがこの操作にとって意味をなすことを保証する

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### 層 3: 環境ガード
**目的:** 特定のコンテキストで危険な操作を防ぐ

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### 層 4: デバッグ用の計装
**目的:** フォレンジックのためにコンテキストを記録する

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## パターンの適用

バグを見つけたとき:

1. **データフローをたどる** - 不正な値はどこで生まれるか？ どこで使われるか？
2. **すべてのチェックポイントを洗い出す** - データが通るすべての地点を挙げる
3. **各層に検証を追加する** - エントリ、ビジネス、環境、デバッグ
4. **各層をテストする** - 層 1 を回避しようとし、層 2 がそれを捕まえることを確認する

## セッションでの例

バグ: 空の `projectDir` が原因で、ソースコードのディレクトリで `git init` が実行された

**データフロー:**
1. テストのセットアップ → 空文字列
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` が `process.cwd()` で実行される

**追加した 4 つの層:**
- 層 1: `Project.create()` が、空でないこと・存在すること・書き込み可能であることを検証する
- 層 2: `WorkspaceManager` が、projectDir が空でないことを検証する
- 層 3: `WorktreeManager` が、テスト中に tmpdir の外での git init を拒否する
- 層 4: git init の前にスタックトレースをログに記録する

**結果:** 1847 件のテストがすべて通り、バグは再現不可能になった

## 重要な洞察

4 つの層はすべて必要でした。テスト中、各層が他の層の見逃したバグを捕まえました:
- 別のコードパスが、エントリの検証を回避した
- モックが、ビジネスロジックのチェックを回避した
- 別のプラットフォームでのエッジケースには、環境ガードが必要だった
- デバッグログが、構造的な誤用を特定した

**検証ポイントを 1 つで止めてはいけません。** すべての層にチェックを追加してください。
