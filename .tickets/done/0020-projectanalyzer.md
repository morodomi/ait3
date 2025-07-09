---
id: '0020'
title: ProjectAnalyzer基盤実装 - 言語検出とプロジェクト分析
status: done
priority: high
created: '2025-07-08T02:11:16.037Z'
updated: '2025-07-08T22:19:52.283Z'
labels:
  - core
  - analyzer
  - architecture
started: '2025-07-08T13:35:55.587Z'
completed: '2025-07-08T22:19:52.283Z'
---
# Ticket #0020: ProjectAnalyzer基盤実装 - 言語検出とプロジェクト分析

## Description

プロジェクトの言語・フレームワーク検出、テスト・リンターコマンドの自動検出、コード分析機能を提供するProjectAnalyzer基盤の実装。

## Background

AIT³フローの各フェーズ（特にGREEN、REFACTOR）では、言語に応じたテストコマンドやリンターコマンドを実行する必要がある。現在はTypeScriptに固定されているが、多言語対応のために自動検出機能が必要。

## Research Results

### 推奨ライブラリ構成
- **linguist-js**: GitHub Linguistの言語検出（150以上の言語対応）
- **cosmiconfig**: 設定ファイルの自動検出
- **find-up**: プロジェクトルート検出
- **tokei/scc**: コードメトリクス計測
- **dependency-cruiser**: JS/TS依存関係分析
- **SonarJS**: コード品質分析

## Implementation Plan

### Phase 1: 基本実装
```typescript
interface ProjectAnalyzer {
  // 基本分析
  detectLanguage(): Promise<LanguageResult>;     // linguist-js使用
  detectFramework(): Promise<Framework>;         // package.json等から推定
  findProjectRoot(): Promise<string>;            // cosmiconfig/find-up使用
  
  // コマンド検出
  getTestCommand(): Promise<string>;             // 言語別マッピング
  getLintCommand(): Promise<string>;             // 設定ファイルから検出
  getFormatCommand(): Promise<string>;           // package.json scripts
}
```

### 言語別コマンドマッピング例
```typescript
const LANGUAGE_COMMANDS = {
  'TypeScript': {
    test: ['npm test', 'vitest', 'jest'],
    lint: ['eslint', 'tslint'],
    format: ['prettier']
  },
  'Python': {
    test: ['pytest', 'python -m unittest'],
    lint: ['ruff', 'pylint', 'flake8'],
    format: ['black', 'ruff format']
  },
  'PHP': {
    test: ['phpunit', 'pest'],
    lint: ['phpcs', 'phpstan'],
    format: ['php-cs-fixer']
  }
};
```

### Phase 2: 拡張機能（将来）
- コードメトリクス（LOC、複雑度）
- 依存関係グラフ
- セキュリティ脆弱性検出
- テストカバレッジ分析

## Tasks

- [ ] linguist-jsの調査と実装
- [ ] 言語別コマンドマッピングの設計
- [ ] ProjectAnalyzerインターフェース実装
- [ ] 既存flowコマンドとの統合
- [ ] ユニットテスト作成
- [ ] ドキュメント更新

## Dependencies

- npm packages: linguist-js, cosmiconfig, find-up
- 既存のServiceパターンとの統合

## Success Criteria

- [ ] 主要言語（JS/TS, Python, PHP, Ruby, Go）の自動検出
- [ ] 適切なテスト・リンターコマンドの提案
- [ ] flow green/refactorコマンドでの活用
- [ ] 拡張可能なアーキテクチャ

## PLANNING Phase (2025-07-08)

### なぜProjectAnalyzerを作成するのか

1. **多言語対応**: 現在TypeScript固定 → Python、PHP、Ruby、Go等に対応
2. **自動設定**: テスト・リンターコマンドの自動検出
3. **導入時間短縮**: 新規プロジェクトへの導入を30分→5分に

### 修正版設計（人間承認済み）

#### インターフェース分離設計
```typescript
// src/services/interfaces/LanguageDetector.ts
export interface LanguageDetector {
  detectLanguages(path?: string): Promise<LanguageResult[]>;
  getPrimaryLanguage(path?: string): Promise<LanguageResult | null>;
}

// src/services/interfaces/CommandDetector.ts
export interface CommandDetector {
  detectTestCommand(path?: string, language?: string): Promise<CommandInfo>;
  detectLintCommand(path?: string, language?: string): Promise<CommandInfo>;
  detectFormatCommand(path?: string, language?: string): Promise<CommandInfo>;
  detectBuildCommand(path?: string, language?: string): Promise<CommandInfo>;
}

// src/services/interfaces/StructureAnalyzer.ts
export interface StructureAnalyzer {
  analyzeStructure(path?: string): Promise<StructureAnalysis>;
  detectFramework(path?: string, language?: string): Promise<FrameworkInfo>;
}

// src/services/interfaces/ProjectAnalyzer.ts (Facade)
export interface ProjectAnalyzer {
  analyzeProject(path?: string): Promise<ProjectAnalysis>;
}
```

#### 実装優先順位
1. analyze language (FileBasedLanguageDetector)
2. analyze command (ConfigBasedCommandDetector)
3. analyze structure (DirectoryStructureAnalyzer)

#### 言語サポート優先順位
1. TypeScript
2. Python/Flask
3. PHP/Laravel

#### キャッシュ戦略
- JSON形式で `.ait3/cache/analysis.json` に保存
- 単一プロジェクトのみ対応（モノレポは将来対応）

### Gemini批判への対応
- ✅ インターフェース分離（責務ごとに分割）
- ✅ 設定の外部化（言語別定義ファイル）
- ✅ キャッシュ戦略の具体化（JSON形式）
- ✅ 単一プロジェクト対応（モノレポは将来）
- ✅ 信頼度スコア導入（0.8以上で自動実行）
