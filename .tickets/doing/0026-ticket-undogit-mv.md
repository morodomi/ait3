---
id: '0026'
title: ticket undoコマンドとgit mv連携実装
status: doing
priority: high
created: '2025-07-08T10:33:44.158Z'
updated: '2025-07-08T10:34:58.397Z'
labels:
  - feature
  - git
  - command
started: '2025-07-08T10:34:58.397Z'
---
# Ticket #0026: ticket undoコマンドとgit mv連携実装

## Description

`ticket undo`コマンドを新規実装し、同時に既存の`ticket start`/`ticket complete`コマンドでのファイル移動をGit連携に改善する。チケットのステータス変更時にファイル移動が発生する場合、Gitで管理されているプロジェクトでは`git mv`コマンドを優先的に使用し、Git履歴を適切に保持する。

## 影響範囲
- 新規コマンド: `ticket undo`
- 既存コマンド改善: `ticket start`, `ticket complete`
- GitServiceとの連携強化
- ファイル移動処理の統一化

## 機能要件

### 1. ticket undoコマンド
- **機能**: チケットのステータスを一つ前の状態に戻す
- **対応する状態遷移**:
  - `doing` → `todo` (ファイル移動: `.tickets/doing/` → `.tickets/todo/`)
  - `done` → `doing` (ファイル移動: `.tickets/done/` → `.tickets/doing/`)
- **制約**: `todo`状態のチケットはundoできない（最初の状態のため）
- **メタデータ更新**: `started`や`completed`タイムスタンプの適切な処理

### 2. Git連携ファイル移動の改善
- **優先順位**:
  1. **Gitリポジトリ内**: `git mv`コマンドでファイル移動
  2. **Git管理外/Git無し**: 通常のファイルシステム操作
- **対象コマンド**:
  - `ticket start`: `todo/` → `doing/` 移動時
  - `ticket complete`: `doing/` → `done/` 移動時  
  - `ticket undo`: 状態に応じた逆方向移動時

### 3. GitService活用
- `isRepository()`: Git管理判定
- `git mv`相当の操作（新メソッド追加が必要）
- エラーハンドリングとフォールバック

## 技術仕様

### ticket undoコマンド実装
```bash
ait3 ticket undo 0026                    # チケット0026を一つ前の状態に戻す
ait3 ticket undo 0026 --dry-run          # 実行前の変更内容をプレビュー
```

### GitService拡張
```typescript
interface GitService {
  // 既存メソッド...
  
  /**
   * Git管理下でファイルを移動
   * @param oldPath - 移動元パス
   * @param newPath - 移動先パス
   */
  moveFile(oldPath: string, newPath: string): Promise<void>;
}
```

### ファイル移動処理の統一
```typescript
async function moveTicketFile(
  oldPath: string, 
  newPath: string, 
  gitService?: GitService
): Promise<void> {
  if (gitService && await gitService.isRepository()) {
    try {
      await gitService.moveFile(oldPath, newPath);
      return;
    } catch (error) {
      // Git操作失敗時はフォールバック
      console.warn('Git move failed, using file system operation');
    }
  }
  
  // フォールバック: 通常のファイル操作
  await fs.rename(oldPath, newPath);
}
```

## Acceptance Criteria

### ticket undoコマンド
- [ ] `doing` → `todo` 状態変更とファイル移動
- [ ] `done` → `doing` 状態変更とファイル移動  
- [ ] `todo`状態のチケットに対する適切なエラー表示
- [ ] `--dry-run`オプションでプレビュー表示
- [ ] メタデータ（started, completed）の適切な更新
- [ ] 不正なチケットIDに対するエラーハンドリング

### Git連携改善
- [ ] GitService.moveFile()メソッド実装
- [ ] `ticket start`でgit mv使用（Git管理下）
- [ ] `ticket complete`でgit mv使用（Git管理下）  
- [ ] Git管理外でのフォールバック動作
- [ ] Git操作失敗時の適切なエラー処理とフォールバック

### 品質要件
- [ ] 包括的なunit tests（pure function testing）
- [ ] integration tests（Git環境、非Git環境）
- [ ] edge caseテスト（権限エラー、ファイル競合等）
- [ ] 100%テストパスレート維持
- [ ] TypeScript strict mode準拠

## 技術検討事項

### 1. GitService.moveFile()実装
- simple-gitライブラリでの`git mv`実行
- 移動先ディレクトリの自動作成
- エラー分類（権限、ファイル存在等）

### 2. 状態管理の整合性
- undoによるメタデータ変更ルール
- 複数回undoの制限（現在は1段階のみ）
- 将来的な拡張性（redo機能等）

### 3. テスト戦略
- Git環境のモック/実環境テスト
- ファイルシステム権限テスト
- 並行実行での競合テスト

### 4. CLIインターフェース
- 既存コマンドとの一貫性
- エラーメッセージの統一
- ヘルプ文書の整備

## Dependencies
- 既存: GitService interface (ticket #0017で実装済み)
- 新規: GitService.moveFile()メソッド追加
- 既存: ticket start/complete コマンド（改善対象）

## 実装順序
1. GitService.moveFile()メソッド追加
2. ファイル移動ユーティリティ関数作成
3. ticket start/complete コマンドのGit連携改善
4. ticket undoコマンド実装
5. 包括的テスト追加
6. ドキュメント更新

## Notes
- Git連携はオプショナル機能として実装（Git無し環境でも動作）
- 既存の動作を破壊しないよう後方互換性を保持
- パフォーマンスに影響しないよう効率的な実装を心がける

---

## PLANNING Phase決定事項

### 現状分析
1. **既存ファイル移動実装**:
   - `LocalTicketService.moveTicketState()`: 通常のファイルシステム操作
   - `writeFile()` → `rename()` → `rm()` の手順
   - Git履歴は保持されない

2. **GitService現状**:
   - ブランチ操作は実装済み（`createBranch`, `checkout`等）
   - ファイル移動メソッド（`moveFile`）は未実装

3. **コマンド構造**:
   - `ticket undo`サブコマンドは存在しない（新規実装）
   - 既存: `create`, `list`, `show`, `start`, `complete`

### 実装アプローチ

#### 1. GitService.moveFile()実装
```typescript
interface GitService {
  // 既存メソッド...
  
  /**
   * Git管理下でファイルを移動
   * @param oldPath - 移動元パス
   * @param newPath - 移動先パス
   */
  moveFile(oldPath: string, newPath: string): Promise<void>;
}
```

**SimpleGitService実装**:
```typescript
async moveFile(oldPath: string, newPath: string): Promise<void> {
  // simple-gitを使用してgit mvを実行
  await this.git.raw(['mv', oldPath, newPath]);
}
```

#### 2. ファイル移動ユーティリティ作成
```typescript
// src/common/file-utils.ts
export async function moveTicketFile(
  oldPath: string, 
  newPath: string, 
  gitService?: GitService
): Promise<void> {
  if (gitService && await gitService.isRepository()) {
    try {
      await gitService.moveFile(oldPath, newPath);
      return;
    } catch (error) {
      console.warn('Git move failed, using file system operation');
    }
  }
  
  // フォールバック: 既存の実装
  await writeFile(newPath, await readFile(oldPath, 'utf-8'), 'utf-8');
  await rename(oldPath, `${oldPath}.tmp`);
  await rm(`${oldPath}.tmp`, { force: true });
}
```

#### 3. LocalTicketService改善
- `moveTicketState()`メソッドでGit連携ファイル移動を使用
- 既存の状態管理ロジックは維持
- エラーハンドリングとフォールバック対応

#### 4. ticket undoコマンド実装
```typescript
// src/commands/ticket/undo.ts
export async function undoTicket(
  args: UndoTicketArgs,
  services: Services
): Promise<CLIResult> {
  // 状態遷移ロジック:
  // doing → todo
  // done → doing
  // todo → エラー（最初の状態）
}
```

**サブコマンド追加**:
```typescript
// src/commands/ticket/index.ts
ticketCommand
  .command('undo <id>')
  .description('Undo ticket to previous state')
  .option('--dry-run', 'Preview changes without executing')
  .action(async (id: string, options) => {
    // undoTicket実装呼び出し
  });
```

### アーキテクチャ設計

#### Pure Function Pattern
```typescript
// Commands (Pure Functions)
export async function undoTicket(args, services) → CLIResult
export async function startTicket(args, services) → CLIResult  // 改善
export async function completeTicket(args, services) → CLIResult  // 改善

// Services (Implementation Layer)
interface TicketService {
  undoTicket(id: string): Promise<void>  // 新規
  // 既存メソッドは改善
}

// Utilities (Pure Functions)
export async function moveTicketFile(oldPath, newPath, gitService) → void
```

#### 依存関係注入
- GitService is optional (test環境では無効化)
- 既存のservices containerパターンを維持
- フォールバック機能で後方互換性確保

### エラーハンドリング戦略

#### 新規エラータイプ
```typescript
export class TicketCannotUndoError extends Error {
  constructor(id: string, currentStatus: string) {
    super(`Cannot undo ticket #${id}: already in '${currentStatus}' state`);
  }
}
```

#### Git操作エラー
- Git操作失敗時は自動的にファイルシステム操作にフォールバック
- エラーログで失敗理由を記録
- ユーザーには透過的に処理継続

### テスト戦略

#### Unit Tests
```typescript
// src/commands/ticket/undo.test.ts
describe('undoTicket', () => {
  // Pure function testing with mocked services
});

// src/services/implementations/SimpleGitService.test.ts  
describe('GitService.moveFile', () => {
  // Git操作のモックテスト
});

// src/common/file-utils.test.ts
describe('moveTicketFile', () => {
  // Git環境/非Git環境のテスト
});
```

#### Integration Tests
```typescript
// tests/integration/cli/ticket/undo.integration.test.ts
// Git環境でのE2Eテスト
// 非Git環境でのフォールバックテスト
```

### 実装フェーズ

#### Phase 1: GitService拡張
1. `GitService.moveFile()`インターフェース追加
2. `SimpleGitService.moveFile()`実装
3. Unit tests作成

#### Phase 2: ファイル移動ユーティリティ
1. `moveTicketFile()`ユーティリティ作成
2. Git/非Git環境のテスト
3. エラーハンドリングテスト

#### Phase 3: 既存コマンド改善
1. `LocalTicketService.moveTicketState()`でGit連携使用
2. `ticket start`/`complete`の動作確認
3. 既存テストの更新

#### Phase 4: ticket undoコマンド
1. `undoTicket()`コマンド実装
2. CLI サブコマンド追加
3. エラーハンドリングとバリデーション

#### Phase 5: 包括的テスト
1. Integration tests完成
2. Edge caseテスト
3. パフォーマンステスト

### 品質保証
- **100%テストパスレート維持**: 既存381testに新規追加
- **TypeScript strict mode**: zero `any` types
- **Pure function architecture**: service injection pattern
- **後方互換性**: 既存動作を破壊しない
- **エラーハンドリング**: 適切なエラー分類と回復処理

### リスク軽減
1. **Git操作失敗**: 自動フォールバック機能
2. **パフォーマンス**: Git判定をキャッシュ化
3. **テスト環境**: GitService無効化で競合回避
4. **ファイル競合**: 原子的操作でデータ整合性確保
