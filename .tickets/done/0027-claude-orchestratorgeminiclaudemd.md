---
id: '0027'
title: .claude設定拡張とコマンド自動インストール - orchestrator/gemini/CLAUDE.md設定の調査と実装
status: done
priority: high
created: '2025-07-08T11:50:29.881Z'
updated: '2025-07-09T02:47:20.765Z'
labels: []
started: '2025-07-08T11:50:45.586Z'
completed: '2025-07-09T02:47:20.765Z'
---
# Ticket #0027: .claude設定拡張とコマンド自動インストール - orchestrator/gemini/CLAUDE.md設定の調査と実装

## Description

.claude/commandsディレクトリにあるorchestrator、gemini、similarity-ts、npmなど、ait3以外のコマンドガイドを自動インストールする機能を実装し、.claude設定全体を拡張する。

## 主要機能

### 1. コマンド自動インストール機能
- orchestrator、gemini、similarity-ts、npmコマンドガイドの自動インストール
- 有用なコマンドガイドの調査と追加
- 各コマンドの使い方と適用場面の検討

### 2. .claude/CLAUDE.md永続設定
- 毎回適用される永続的な指示の設定（例：日本語での応答）
- Claude Code使用時の共通設定の管理
- プロジェクト固有の指示とグローバル指示の分離

### 3. .claude設定の調査と改善
- settings.local.jsonの最適化
- 環境変数とパーミッション設定の見直し
- Claude Code統合の強化

### 4. インストール機能設計
- `ait3 install command [command-name]` の拡張
- 一括インストール機能の改善
- コマンドガイドのテンプレート管理

## 調査対象コマンド

### 既存コマンド分析
- **orchestrator**: 複雑なタスクを逐次ステップに分割（並列サブタスク対応）
- **gemini**: 大規模コードベース分析（巨大コンテキストウィンドウ活用）
- **similarity-ts**: コードの重複検出とリファクタリング支援
- **npm**: npmスクリプトとTiDDワークフロー統合

### 新規コマンド候補
- **typescript**: 型チェックとコンパイル支援
- **git**: Git操作とワークフロー統合
- **testing**: テスト戦略とカバレッジ分析
- **security**: セキュリティ監査とベストプラクティス

## Acceptance Criteria

- [ ] orchestrator、gemini、similarity-ts、npmの自動インストール機能
- [ ] 新規有用コマンドの調査と1つ以上の追加
- [ ] .claude/CLAUDE.mdの永続設定実装
- [ ] settings.local.jsonの最適化
- [ ] `ait3 install command`の拡張実装
- [ ] 一括インストール機能の改善
- [ ] 各コマンドの使用方法ドキュメント
- [ ] Claude Codeとの統合テスト

## Technical Requirements

- Pure Functions + Service Injection パターンの維持
- 既存のinstallコマンド基盤の拡張
- テンプレート管理機能の実装
- 設定ファイルの安全な更新機能

## Dependencies

- 既存のinstall/claude.ts、install/commands.tsの理解
- .claude/commands/テンプレートの分析
- Claude Code MCP統合の検証

## PLANNING Phase Analysis

### 現状分析

#### 既存の.claude構造
```
.claude/
├── commands/
│   ├── ait3                    # AIT³ CLI commands guide (5KB)
│   ├── gemini                  # Large codebase analysis guide (10KB)  
│   ├── npm                     # NPM scripts guide (8.8KB)
│   ├── orchestrator            # Task splitting guide (3.3KB)
│   └── similarity-ts           # Code duplication detection (11.7KB)
└── settings.local.json         # Environment settings (1.1KB)
```

#### 既存インストールシステム
- **Location**: `src/commands/install/command.ts`
- **Current Support**: ait3コマンドガイドのみ
- **Template System**: `src/assets/commands/ait3.ts` 
- **Limitations**: 
  - 1つのテンプレートのみ（ait3）
  - ハードコードされた commandGuides オブジェクト
  - 他のコマンドガイド（gemini、orchestrator等）は未サポート

#### 既存コマンドガイドの特徴
- **ait3**: 5KB - AIT³ワークフローとコマンド説明
- **gemini**: 10KB - 大規模コードベース分析（@syntax、TiDDワークフロー統合）
- **npm**: 8.8KB - npmスクリプトとTiDDフェーズ統合
- **orchestrator**: 3.3KB - 複雑タスクの逐次ステップ分割
- **similarity-ts**: 11.7KB - コード重複検出とリファクタリング支援

### 設計方針

#### 1. Command Auto-Installation System Architecture

##### Template Management Strategy
```typescript
// Current (Limited)
const commandGuides = {
  ait3: 'ait3.md'
};

// Proposed (Extensible)
const commandGuides = {
  ait3: 'ait3.ts',
  gemini: 'gemini.ts', 
  npm: 'npm.ts',
  orchestrator: 'orchestrator.ts',
  'similarity-ts': 'similarity-ts.ts',
  // New commands
  typescript: 'typescript.ts',
  git: 'git.ts',
  testing: 'testing.ts'
};
```

##### Template Loading Strategy
```typescript
// Current (Single template)
async function getTemplateContent(commandName: string): Promise<string> {
  if (commandName === 'ait3') {
    return ait3Template;
  }
  throw new Error(`Template not found for command: ${commandName}`);
}

// Proposed (Dynamic loading)
async function getTemplateContent(commandName: string): Promise<string> {
  try {
    const template = await import(`../../assets/commands/${commandName}.js`);
    return template[`${commandName}Template`];
  } catch (error) {
    throw new Error(`Template not found for command: ${commandName}`);
  }
}
```

##### Installation Flow Enhancement
```typescript
// Proposed Enhanced Command Structure
interface CommandMeta {
  name: string;
  description: string;
  category: 'core' | 'analysis' | 'development' | 'workflow';
  size: string;
  dependencies?: string[];
  recommended: boolean;
}

const availableCommands: Record<string, CommandMeta> = {
  ait3: { name: 'ait3', description: 'AIT³ CLI commands and workflow', category: 'core', size: '5KB', recommended: true },
  gemini: { name: 'gemini', description: 'Large codebase analysis', category: 'analysis', size: '10KB', recommended: true },
  orchestrator: { name: 'orchestrator', description: 'Complex task splitting', category: 'workflow', size: '3KB', recommended: true },
  'similarity-ts': { name: 'similarity-ts', description: 'Code duplication detection', category: 'development', size: '12KB', recommended: true },
  npm: { name: 'npm', description: 'NPM scripts integration', category: 'development', size: '9KB', recommended: true }
};
```

#### 2. CLAUDE.md Persistent Configuration Strategy

##### Configuration Hierarchy
```
.claude/CLAUDE.md (Project-specific persistent instructions)
├── Language preferences (Japanese responses)
├── Project context (AIT³ TiDD workflow)  
├── Code style preferences
├── Testing approach preferences
└── AI collaboration patterns
```

##### Content Strategy
```markdown
# Claude Code Project Configuration

## Language & Communication
- **Primary Language**: 日本語での応答を基本とする
- **Technical Terms**: 英語の技術用語はそのまま使用
- **Response Style**: 簡潔で具体的な回答を心がける

## AIT³ TiDD Workflow Context  
- **Methodology**: PLANNING → RED → GREEN → REFACTOR → SQUASH
- **Test Philosophy**: 100% test pass rate が必須条件
- **Architecture**: Pure Functions + Service Injection pattern

## Code Quality Standards
- **TypeScript**: Strict mode, zero 'any' types
- **Testing**: Vitest, 100% coverage requirement
- **Error Handling**: Comprehensive error propagation

## AI Collaboration Pattern
- **Claude Role**: Implementation and optimization proposals
- **Gemini Role**: Architectural critique and alternative analysis  
- **Human Role**: Final decision synthesis and context judgment
```

#### 3. Settings.local.json Optimization

##### Current Analysis
```json
{
  "env": { "MAX_THINKING_TOKENS": "30000" },
  "permissions": {
    "allow": [
      // 41 permissions currently configured
      // Mix of specific and general permissions
    ]
  }
}
```

##### Optimization Strategy
```json
{
  "env": {
    "MAX_THINKING_TOKENS": "30000",
    "CLAUDE_RESPONSE_LANG": "ja",
    "AIT3_PROJECT_ROOT": "true",
    "TIDD_WORKFLOW_ENABLED": "true"
  },
  "permissions": {
    "allow": [
      // Core development
      "Bash(ait3:*)",
      "Bash(npm:*)", 
      "Bash(git:*)",
      "Bash(node:*)",
      
      // AI tools
      "Bash(gemini:*)",
      "Bash(similarity-ts:*)",
      
      // System tools
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      "Bash(mkdir:*)",
      "Bash(mv:*)",
      "Bash(sed:*)",
      
      // Web access for documentation
      "WebFetch(domain:github.com)",
      "WebFetch(domain:docs.anthropic.com)"
    ],
    "deny": []
  }
}
```

#### 4. New Command Identification

##### Priority 1 (High Value, TiDD Integration)
- **typescript**: TypeScript development support with TiDD workflow
- **testing**: Comprehensive testing strategies for each TiDD phase
- **git**: Git workflow optimization for AIT³ methodology

##### Priority 2 (Development Enhancement) 
- **security**: Security audit and best practices
- **performance**: Performance analysis and optimization
- **documentation**: Documentation generation and maintenance

##### Priority 3 (Specialized Tools)
- **docker**: Container development workflow
- **database**: Database schema and migration management
- **api**: REST/GraphQL API development patterns

#### 5. Implementation Architecture

##### File Structure Changes
```
src/
├── assets/
│   └── commands/
│       ├── ait3.ts (existing)
│       ├── gemini.ts (new)
│       ├── npm.ts (new)
│       ├── orchestrator.ts (new)
│       ├── similarity-ts.ts (new)
│       ├── typescript.ts (new)
│       ├── git.ts (new)
│       └── testing.ts (new)
├── commands/
│   └── install/
│       ├── command.ts (enhanced)
│       ├── claude-md.ts (new)
│       └── settings.ts (new)
└── common/
    └── claude-config.ts (new)
```

##### Command Implementation Strategy
```typescript
// Enhanced install command with multiple targets
ait3 install command [name]           # Install specific command
ait3 install command --all            # Install all recommended commands
ait3 install command --category core  # Install by category
ait3 install claude-md               # Install CLAUDE.md config
ait3 install settings                # Optimize settings.local.json
ait3 install --complete              # Complete setup (all components)
```

### 実装フェーズ計画

#### RED Phase
- install command拡張のための失敗テスト作成
- template loading systemのテスト
- CLAUDE.md生成機能のテスト
- settings optimization機能のテスト

#### GREEN Phase  
- 既存commandGuides拡張
- Dynamic template loading実装
- CLAUDE.md生成コマンド実装
- settings最適化コマンド実装

#### REFACTOR Phase
- Template management system抽象化
- Command metadata system実装
- Installation workflow最適化
- Error handling enhancement

#### SQUASH Phase
- Clean commit history
- Integration testing
- Documentation update

## 実装推奨事項

### Phase 1: 基盤拡張（HIGH Priority）
1. **Template System Expansion**
   - 既存の5つのコマンドガイド（gemini、npm、orchestrator、similarity-ts）をtemplate化
   - Dynamic template loading機能実装
   - Command metadata system導入

2. **CLAUDE.md Persistent Configuration**
   - .claude/CLAUDE.md自動生成機能
   - 日本語応答設定とプロジェクト固有指示の統合
   - Claude Code読み込み時の永続的設定適用

3. **Settings Optimization**
   - 環境変数の整理と新規変数追加
   - Permission設定の最適化
   - AIT³固有の設定追加

### Phase 2: コマンド拡張（MEDIUM Priority）
1. **Priority 1 Commands Implementation**
   - typescript: TypeScript開発支援とTiDDワークフロー統合
   - testing: フェーズ別テスト戦略ガイド
   - git: AIT³メソドロジー向けGitワークフロー

2. **Installation Enhancement**
   - Category-based installation機能
   - Batch installation機能（--all、--category）
   - Complete setup機能（--complete）

### Phase 3: 高度機能（LOW Priority）
1. **Advanced Commands**
   - security: セキュリティ監査とベストプラクティス
   - performance: パフォーマンス分析と最適化
   - documentation: ドキュメント生成と保守

2. **Integration Features**
   - Command dependency管理
   - Version管理とupdate機能
   - Usage analytics

## 技術的判断のポイント

### Template Loading Strategy
- **現在**: Static import with hardcoded if-else
- **推奨**: Dynamic import with naming convention
- **理由**: 拡張性と保守性の向上、新しいコマンド追加の簡素化

### CLAUDE.md Content Strategy
- **言語設定**: 日本語応答を基本、技術用語は英語維持
- **プロジェクト文脈**: AIT³ TiDDワークフローの説明と期待値設定
- **AI協調パターン**: Claude-Gemini-Human triadの明確化

### Settings Optimization Priority
1. **環境変数**: CLAUDE_RESPONSE_LANG、AIT3_PROJECT_ROOT
2. **Permission整理**: グループ化と重複排除
3. **新機能対応**: 今後の拡張を考慮した権限設計

## リスク評価

### 技術リスク
- **Low**: 既存システムとの互換性維持
- **Medium**: Dynamic import後方互換性
- **Low**: Template file管理の複雑性

### 実装リスク
- **Low**: Pure function architectureの維持
- **Low**: Existing test coverageへの影響
- **Medium**: 大量のtemplate file追加による保守性

### ユーザー体験リスク
- **Low**: 既存install commandの動作変更
- **Low**: 新機能学習コスト
- **Medium**: 設定過多による混乱

## 成功基準

### 機能的成功基準
- [ ] 既存5コマンドの自動インストール機能
- [ ] CLAUDE.md永続設定機能
- [ ] Settings最適化機能
- [ ] 1つ以上の新規コマンド追加
- [ ] 既存機能の100%後方互換性

### 非機能的成功基準
- [ ] インストール時間: 5秒以内（全コマンド）
- [ ] ファイルサイズ: 各テンプレート15KB以下
- [ ] 保守性: 新コマンド追加が5分以内
- [ ] 信頼性: 100%のテスト成功率

### ユーザー体験成功基準
- [ ] 日本語での自然な応答
- [ ] AIT³ワークフローの自動認識
- [ ] 一括セットアップ機能の提供
- [ ] 明確なエラーメッセージとガイダンス
