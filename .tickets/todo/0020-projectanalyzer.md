---
id: '0020'
title: ProjectAnalyzer基盤実装 - 言語検出とプロジェクト分析
status: todo
priority: high
created: '2025-07-08T02:11:16.037Z'
updated: '2025-07-08T02:11:16.037Z'
labels:
  - core
  - analyzer
  - architecture
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
