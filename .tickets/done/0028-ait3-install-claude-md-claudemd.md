---
id: 0028
title: ait3 install claude-md - プロジェクト分析とCLAUDE.md更新提案機能
status: done
priority: medium
created: '2025-07-08T13:06:19.950Z'
updated: '2025-07-09T04:48:29.919Z'
labels: []
started: '2025-07-09T03:45:36.082Z'
completed: '2025-07-09T04:48:29.919Z'
---
# Ticket #0028: ait3 install claude-md - プロジェクト分析とCLAUDE.md更新提案機能

## Description

CLAUDE.md生成をサポートする2つのコマンドを実装する：

### 1. `ait3 install claude-md` (シンプル)
- CLAUDE.mdテンプレートファイルのみ生成
- `src/assets/templates/claude-md-template.md` として出力
- 最小限の処理でテンプレート提供

### 2. `ait3 init claude-md` (包括的)  
- プロジェクト分析実行 (`ait3 analyze project` 相当)
- 多言語対応のプロジェクト検出
- 分析結果とテンプレート生成
- Next Action指示（Claude Code編集ガイダンス）

## 主要機能

### 1. テンプレート生成機能 (`ait3 install claude-md`)
- **Base Template**: 基本的なCLAUDE.mdテンプレート生成
- **Output Location**: `src/assets/templates/claude-md-template.md`
- **Minimal Processing**: シンプルな固定テンプレート提供
- **Quick Setup**: 即座に編集可能なテンプレート

### 2. プロジェクト分析エンジン (`ait3 init claude-md`)
- **Multi-Language Detection**: Node.js, PHP, Python, Go対応
- **Dependencies分析**: package.json, composer.json, requirements.txt等
- **Structure分析**: ディレクトリ構造、アーキテクチャパターン検出
- **Commands Detection**: プロジェクト固有のbuild/test/devコマンド
- **Docker Detection**: Dockerfile, compose.yml/yaml対応

### 3. 包括的分析結果出力
- **Project Analysis**: `docs/references/project-analysis.md`
- **Detected Commands**: `docs/references/detected-commands.md`
- **Template Generation**: カスタマイズされたCLAUDE.mdテンプレート
- **Next Action Guidance**: Claude Code編集の具体的手順

## Acceptance Criteria

### `ait3 install claude-md` (シンプル版)
- [ ] 基本的なCLAUDE.mdテンプレート生成
- [ ] `src/assets/templates/claude-md-template.md` ファイル出力
- [ ] AIT³ワークフロー情報を含むテンプレート
- [ ] 即座に編集可能な構造化テンプレート

### `ait3 init claude-md` (包括版)
- [ ] 多言語プロジェクト検出 (Node.js, PHP, Python, Go)
- [ ] package.json/composer.json/requirements.txt 自動分析
- [ ] プロジェクト固有コマンド検出 (test, build, dev等)
- [ ] Docker設定検出 (Dockerfile, compose.yml/yaml)
- [ ] ディレクトリ構造とアーキテクチャパターン分析
- [ ] `docs/references/project-analysis.md` 出力
- [ ] `docs/references/detected-commands.md` 出力
- [ ] カスタマイズされたCLAUDE.mdテンプレート生成
- [ ] Claude Code編集の Next Action 指示

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

## PLANNING Phase Results

### 🎯 Final Design Decisions

#### 1. Command Structure
- **`ait3 init`**: `.claude/commands/ait3-init` インストール  
- **`ait3 install claude-md`**: シンプルなCLAUDE.mdテンプレート生成
- **`ait3 init claude-md`**: 包括的分析 + テンプレート生成 + Next Action
- **`/ait3-init`**: Claude Code自動実行（`ait3 init claude-md` を含む）

#### 2. Multi-Language Support
- **Node.js/TypeScript**: `package.json`, `npm test`, `npm run build`
- **PHP**: `composer.json`, `composer test`, `composer build`
- **Python**: `requirements.txt`, `pytest`, `python -m build`
- **Go**: `go.mod`, `go test`, `go build`

#### 3. Docker Detection Updates
- **Old**: `docker-compose.yml`
- **New**: `compose.yml`, `compose.yaml` (both supported)

#### 4. Output Structure
```
src/assets/templates/
└── claude-md-template.md    # Claude Code編集用テンプレート

docs/references/
├── project-analysis.md      # プロジェクト分析結果
└── detected-commands.md     # 検出されたコマンド一覧
```

#### 5. Claude Code Automation Flow
1. **User**: `/ait3-init`
2. **Claude Code**: `ait3 init claude-md` 実行
3. **Claude Code**: 生成ファイル読み込み (Read tool)
4. **Claude Code**: テンプレート編集 (Edit tool)
5. **Claude Code**: `CLAUDE.md` として保存 (Write tool)

#### 6. Simplified Initialization
- **チケットシステム初期化**: 不要（`ait3 ticket create`で自動作成）
- **Gemini相談**: 初期化時は不要（後で任意で実行）
- **焦点**: CLAUDE.md生成とプロジェクト理解支援

### 🎯 Implementation Priority
1. **Core**: 多言語プロジェクト検出
2. **Template**: src/assets/templates/claude-md-template.md 生成
3. **Analysis**: docs/references/ 配下の分析結果出力
4. **Command**: ait3 init / ait3 init claude-md 実装
5. **Guide**: .claude/commands/ait3-init 更新

## Notes

- Claude Code自動実行に特化した設計
- 人間への指示は一切なし
- 多言語対応の包括的なプロジェクト分析
- 簡素化されたフロー（チケット初期化不要）
