# プロジェクトルート検出機能の実装計画（改訂版）

**日付**: 2025-08-05  
**チケット**: #135 - ネストした.ticketsディレクトリを防ぐためのプロジェクトルート検出  
**作成者**: Claude Code  
**改訂**: Gitの実装アプローチとGeminiのフィードバックに基づく

## Gitの実装から得た重要な知見

Gitは同じ問題をキャッシュなしで解決している：
- 現在のディレクトリから上方向に`.git`を探索
- コマンド実行間でのキャッシュは無し
- それでも日常使用に十分な性能
- 安全境界と環境変数による上書き機能を含む

## 改訂された解決策

### 1. シンプルなディレクトリ探索（キャッシュなし）

```typescript
// src/common/utils/projectRootUtils.ts
import { access, constants } from 'fs/promises';
import { join, dirname, parse, isAbsolute } from 'path';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findProjectRoot(startPath: string = process.cwd()): Promise<string> {
  let current = startPath;
  let previous = '';
  const root = parse(current).root;

  // ファイルシステムのルートに到達するまで上方向に探索
  while (current !== root && current !== previous) {
    // .ticketsディレクトリをチェック
    if (await exists(join(current, '.tickets'))) {
      return current;
    }
    
    // .gitディレクトリ/ファイルをチェック（worktreeにも対応）
    if (await exists(join(current, '.git'))) {
      return current;
    }
    
    // 一つ上のディレクトリへ移動
    previous = current;
    current = dirname(current);
  }
  
  // 開始ディレクトリにフォールバック
  return startPath;
}
```

### 2. すべてのprocess.cwd()使用箇所を修正

特定して修正すべき箇所：
```typescript
// ServiceFactory.ts - loadConfig()
const projectRoot = await findProjectRoot();
const ticketsPath = process.env.TICKETS_DIR || '.tickets';

// 絶対パスと相対パスのTICKETS_DIRを処理
const resolvedTicketsPath = isAbsolute(ticketsPath) 
  ? ticketsPath 
  : join(projectRoot, ticketsPath);

// ServiceFactory.ts - createProjectAnalyzer()
const projectRoot = await findProjectRoot();
return new DefaultProjectAnalyzer(projectRoot, ...);
```

### 3. 環境変数の処理

```typescript
// GIT_DIRと同様に、AIT3_PROJECT_ROOTを追加
export async function getProjectRoot(): Promise<string> {
  // 明示的な上書きを許可
  if (process.env.AIT3_PROJECT_ROOT) {
    return process.env.AIT3_PROJECT_ROOT;
  }
  
  // それ以外は探索
  return findProjectRoot();
}
```

### 4. 将来の拡張（オプション）：上限ディレクトリ

```typescript
// GIT_CEILING_DIRECTORIESと同様
export async function findProjectRootWithCeiling(
  startPath: string = process.cwd(),
  ceilingDirs?: string[]
): Promise<string> {
  // 上限ディレクトリに到達したら探索を停止
  // 深いディレクトリ構造でのパフォーマンス向上に有用
}
```

## 実装の変更内容

### ServiceFactory.ts
```typescript
private static async loadConfig(): Promise<BackendConfig> {
  try {
    const projectRoot = await getProjectRoot();
    const ticketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // 絶対パスを正しく処理
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
    const projectRoot = await getProjectRoot();
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

// createProjectAnalyzerも修正
private static async createProjectAnalyzer(): Promise<ProjectAnalyzer> {
  const rootPath = await getProjectRoot();
  // ... 残りの実装
}
```

## テスト戦略

### ユニットテスト
```typescript
describe('findProjectRoot', () => {
  it('現在のディレクトリで.ticketsを見つける');
  it('親ディレクトリで.ticketsを見つける');
  it('.ticketsがない場合は.gitを見つける');
  it('.gitより.ticketsを優先する');
  it('ファイルシステムのルートを正しく処理する');
  it('何も見つからない場合は開始ディレクトリを返す');
});

describe('getProjectRoot', () => {
  it('AIT3_PROJECT_ROOT環境変数を尊重する');
  it('環境変数が設定されていない場合は探索にフォールバック');
});
```

### 統合テスト
```typescript
describe('プロジェクトルートを使用したServiceFactory', () => {
  it('サブディレクトリにいる時にプロジェクトルートから設定を読み込む');
  it('正しいルートパスでアナライザーを作成する');
  it('絶対パスのTICKETS_DIRを正しく処理する');
  it('相対パスのTICKETS_DIRを正しく処理する');
});
```

## このアプローチの利点

1. **シンプルさ**: キャッシュの複雑さがなく、Gitの実証済みパターンに従う
2. **信頼性**: すべてのコマンド呼び出しで一貫して動作
3. **パフォーマンス**: ディレクトリ探索は十分高速（Gitが証明）
4. **互換性**: 後方互換性を維持
5. **柔軟性**: 特殊なケースのための環境変数による上書き

## 移行計画

1. **フェーズ1**: 基本的な探索の実装
   - `findProjectRoot`ユーティリティを追加
   - ServiceFactoryメソッドを更新
   - 包括的なテストを追加

2. **フェーズ2**: すべてのprocess.cwd()使用箇所を修正
   - コードベース全体を監査
   - すべての箇所を更新
   - 一貫性を確保

3. **フェーズ3**: ドキュメントとエッジケース
   - 動作をドキュメント化
   - 環境変数サポートを追加
   - 発見されたエッジケースを処理

## 結論

Gitのアプローチに従うことで、キャッシュの複雑さのないシンプルで実証済みの解決策を得られる。パフォーマンスへの影響は無視できる程度（Gitが証明）で、実装は理解しやすく保守しやすい。