# プロジェクトルート検出機能の実装計画（最終版）

**日付**: 2025-08-05  
**チケット**: #135 - ネストした.ticketsディレクトリを防ぐためのプロジェクトルート検出  
**作成者**: Claude Code  
**レビュー**: Geminiによるパフォーマンスレビュー、Claudeによる正確性・セキュリティレビュー完了

## エグゼクティブサマリー

サブディレクトリから`ait3`コマンドを実行した際に新しい`.tickets`ディレクトリが作成される問題を解決するため、Gitと同様のディレクトリ探索アルゴリズムを実装する。レビューで発見されたCriticalおよびImportant問題をすべて対応した設計。

## 実装内容

### 1. プロジェクトルート検出ユーティリティ

```typescript
// src/common/utils/projectRootUtils.ts
import { access, constants, stat, realpath } from 'fs/promises';
import { join, dirname, parse, isAbsolute } from 'path';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 現在のユーザーが所有しているかチェック（セキュリティ対策）
 */
async function isOwnedByCurrentUser(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.uid === process.getuid();
  } catch {
    return false;
  }
}

/**
 * プロジェクトルートを探索
 * シンボリックリンクを正規化してから処理（正確性向上）
 */
export async function findProjectRoot(startPath: string = process.cwd()): Promise<string> {
  // シンボリックリンクを解決
  let current = await realpath(startPath);
  let previous = '';
  const root = parse(current).root;

  // ファイルシステムのルートに到達するまで上方向に探索
  while (current !== root && current !== previous) {
    // .ticketsディレクトリをチェック
    const ticketsPath = join(current, '.tickets');
    if (await exists(ticketsPath)) {
      // セキュリティ: 所有者チェック
      if (await isOwnedByCurrentUser(ticketsPath)) {
        return current;
      }
      console.warn(`Skipping ${ticketsPath}: not owned by current user`);
    }
    
    // .gitディレクトリ/ファイルをチェック
    const gitPath = join(current, '.git');
    if (await exists(gitPath)) {
      // セキュリティ: 所有者チェック
      if (await isOwnedByCurrentUser(gitPath)) {
        return current;
      }
      console.warn(`Skipping ${gitPath}: not owned by current user`);
    }
    
    // 一つ上のディレクトリへ移動
    previous = current;
    current = dirname(current);
  }
  
  // 開始ディレクトリにフォールバック
  return startPath;
}

/**
 * 環境変数を考慮したプロジェクトルート取得
 * 環境変数の検証を強化（セキュリティ対策）
 */
export async function getProjectRoot(): Promise<string> {
  // 環境変数による明示的な指定をチェック
  if (process.env.AIT3_PROJECT_ROOT) {
    const envPath = process.env.AIT3_PROJECT_ROOT;
    
    try {
      // パスを正規化
      const resolvedPath = await realpath(envPath);
      
      // 存在確認
      if (!await exists(resolvedPath)) {
        throw new Error(`Path does not exist: ${envPath}`);
      }
      
      // 所有者確認
      if (!await isOwnedByCurrentUser(resolvedPath)) {
        throw new Error(`Path not owned by current user: ${envPath}`);
      }
      
      return resolvedPath;
    } catch (error) {
      console.error(`Invalid AIT3_PROJECT_ROOT: ${error.message}`);
      console.error('Falling back to automatic detection');
    }
  }
  
  // 自動探索
  return findProjectRoot();
}
```

### 2. ServiceFactoryの最適化（重複探索の解消）

```typescript
// src/services/ServiceFactory.ts
export class ServiceFactory {
  /**
   * プロジェクトルート探索を一度だけ実行（パフォーマンス最適化）
   */
  static async createServices(): Promise<Services> {
    // 1. プロジェクトルートの検出を一度だけ実行
    const projectRoot = await getProjectRoot();
    
    // 2. 結果を各メソッドに渡す
    const config = await this.loadConfig(projectRoot);
    const gitService = this.createGitService();
    const projectAnalyzer = this.createProjectAnalyzer(projectRoot);
    
    return {
      ticketService: this.createTicketService(config, gitService),
      gitService,
      projectAnalyzer
    };
  }

  /**
   * プロジェクトルートを引数として受け取る
   */
  private static async loadConfig(projectRoot: string): Promise<BackendConfig> {
    try {
      const ticketsDir = process.env.TICKETS_DIR || '.tickets';
      
      // 絶対パスと相対パスを正しく処理
      const ticketsPath = isAbsolute(ticketsDir)
        ? ticketsDir
        : join(projectRoot, ticketsDir);
      
      const configPath = join(ticketsPath, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      return {
        backend: config.backend || 'local',
        local: config.local || { path: ticketsPath },
        github: config.github
      };
    } catch {
      // フォールバック設定
      const ticketsDir = process.env.TICKETS_DIR || '.tickets';
      const ticketsPath = isAbsolute(ticketsDir)
        ? ticketsDir
        : join(projectRoot, ticketsDir);
      
      return {
        backend: 'local',
        local: { path: ticketsPath }
      };
    }
  }

  /**
   * プロジェクトルートを引数として受け取る
   */
  private static createProjectAnalyzer(projectRoot: string): ProjectAnalyzer {
    const languageDetector = new LinguistLanguageDetector(projectRoot);
    const commandDetector = new ConfigBasedCommandDetector(projectRoot);
    const structureAnalyzer = new DirectoryStructureAnalyzer(projectRoot);
    
    return new DefaultProjectAnalyzer(
      projectRoot,
      languageDetector,
      commandDetector,
      structureAnalyzer
    );
  }
}
```

## テスト計画

### ユニットテスト

```typescript
describe('findProjectRoot', () => {
  // 基本機能
  it('現在のディレクトリで.ticketsを見つける');
  it('親ディレクトリで.ticketsを見つける');
  it('.ticketsがない場合は.gitを見つける');
  it('.gitより.ticketsを優先する');
  it('何も見つからない場合は開始ディレクトリを返す');
  
  // セキュリティ
  it('他ユーザーが所有する.ticketsをスキップする');
  it('他ユーザーが所有する.gitをスキップする');
  
  // エッジケース
  it('シンボリックリンクを正しく解決する');
  it('ファイルシステムのルートで無限ループしない');
});

describe('getProjectRoot', () => {
  // 環境変数
  it('有効なAIT3_PROJECT_ROOTを使用する');
  it('存在しないAIT3_PROJECT_ROOTでフォールバック');
  it('他ユーザーのAIT3_PROJECT_ROOTでフォールバック');
  it('シンボリックリンクのAIT3_PROJECT_ROOTを解決');
});

describe('ServiceFactory', () => {
  // パフォーマンス
  it('プロジェクトルート探索を一度だけ実行する');
  it('loadConfigとcreateProjectAnalyzerで同じルートを使用');
});
```

### 統合テスト

```typescript
describe('サブディレクトリからのコマンド実行', () => {
  it('深いディレクトリからでもルートの.ticketsを使用');
  it('ネストした.ticketsディレクトリを作成しない');
  it('TICKETS_DIRの絶対パスを正しく処理');
  it('TICKETS_DIRの相対パスを正しく処理');
  it('シンボリックリンクされたディレクトリから正しく動作');
});
```

## 実装フェーズ

### Phase 1: コア機能実装（1-2日）
1. `projectRootUtils.ts`の作成
   - 基本的な探索機能
   - シンボリックリンク対応
   - 所有者チェック
   - 環境変数検証

2. ServiceFactoryの更新
   - 重複探索の解消
   - プロジェクトルートの受け渡し

3. 基本的なテストの作成

### Phase 2: 完全な統合（1日）
1. すべての`process.cwd()`使用箇所の監査と修正
2. 統合テストの追加
3. エッジケースのテスト

### Phase 3: ドキュメントと仕上げ（0.5日）
1. ユーザードキュメントの更新
2. 環境変数の説明追加
3. マイグレーションガイド作成

## リスクと対策

### リスク
1. **既存プロジェクトへの影響**: 動作が変わる可能性
   - **対策**: 十分なテストとフォールバック機構

2. **パフォーマンス**: 深いディレクトリでの遅延
   - **対策**: 実用上問題ないレベル（Gitが証明）

3. **セキュリティ**: 他ユーザーのディレクトリアクセス
   - **対策**: 所有者チェックの実装

## 成功基準

1. サブディレクトリからのコマンド実行でネストした`.tickets`が作成されない
2. 既存のプロジェクトが正常に動作し続ける
3. パフォーマンスの顕著な低下がない
4. セキュリティリスクが適切に軽減されている

## 結論

この実装により、ユーザーはプロジェクト内のどのディレクトリからでも`ait3`コマンドを安全かつ効率的に実行できるようになる。Gitのアプローチを参考にしつつ、レビューで発見されたすべての重要な問題に対処した堅牢な設計となっている。