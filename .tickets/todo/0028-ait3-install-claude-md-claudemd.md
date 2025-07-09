---
id: 0028
title: ait3 install claude-md - プロジェクト分析とCLAUDE.md更新提案機能
status: todo
priority: medium
created: '2025-07-08T13:06:19.950Z'
updated: '2025-07-08T13:06:19.950Z'
labels: []
---
# Ticket #0028: ait3 install claude-md - プロジェクト分析とCLAUDE.md更新提案機能

## Description

CLAUDE.mdを直接作成せず、プロジェクト分析を行いCLAUDE.md更新提案を表示するコマンドを実装する。ユーザーに「以上の内容を参考に、geminiにも相談して、CLAUDE.mdを更新してください。」といったNext Actionを提示する。

## 主要機能

### 1. プロジェクト分析エンジン
- **Dependencies分析**: package.json、技術スタック検出
- **Structure分析**: ディレクトリ構造、アーキテクチャパターン検出
- **Design Pattern分析**: Pure Functions + Service Injection等の特定
- **Testing Strategy分析**: テストフレームワーク、カバレッジ設定検出

### 2. CLAUDE.md提案生成
- **Project Overview**: 分析結果に基づく概要生成
- **Technology Stack**: 自動検出された技術一覧
- **Architecture**: 検出されたアーキテクチャパターン説明
- **Development Workflow**: AIT³ TiDDワークフロー統合
- **Project Structure**: ディレクトリ構造の説明

### 3. Next Action提示
- Gemini相談の具体的指示
- CLAUDE.md更新手順の説明
- 追加調査が必要な項目の指摘

## Acceptance Criteria

- [ ] `ait3 install claude-md`コマンド実装
- [ ] package.json自動分析機能
- [ ] ディレクトリ構造分析機能
- [ ] 技術スタック検出機能
- [ ] アーキテクチャパターン検出機能
- [ ] CLAUDE.md提案内容生成機能
- [ ] Next Action指示の表示機能
- [ ] 分析結果の構造化出力

## Technical Requirements

### 分析対象ファイル
```typescript
interface AnalysisTargets {
  packageJson: boolean;
  tsConfigJson: boolean;
  directoryStructure: boolean;
  testConfiguration: boolean;
  gitConfiguration: boolean;
  existingClaudeMd: boolean;
}
```

### 提案内容構造
```typescript
interface ClaudeMdProposal {
  projectOverview: string;
  technologyStack: TechStack[];
  architecture: ArchitectureInfo;
  developmentWorkflow: WorkflowInfo;
  projectStructure: DirectoryInfo[];
  nextActions: string[];
}
```

## Implementation Strategy

### Phase 1: 分析エンジン基盤
- ProjectAnalysisService拡張
- ファイルシステム分析ユーティリティ
- 技術スタック検出ロジック

### Phase 2: 提案生成システム  
- CLAUDE.md template engine
- 分析結果のstructured output
- Next Action生成ロジック

### Phase 3: コマンド統合
- install/claude-md.tsの実装
- CLI interface設計
- エラーハンドリング

## Dependencies

- 新規: ProjectAnalysisService機能拡張が必要
- 既存: src/commands/install/基盤活用
- 分析: package.json、tsconfig.json、ディレクトリ構造解析機能

## Notes

- ファイル作成ではなく提案表示に特化
- Human-AI協調を重視した設計
- 拡張可能な分析エンジン設計
