# Claude Code 公式ドキュメント調査結果

## 調査目的

AIがAIT³フローに沿って自動開発を実行する際の支援ツールを複数用意し、開発を加速させる。現状の課題：
- 過剰なテスト作成
- 機能修正時に既存テストを修正せず新規テストファイルを作成
- 方向性のブレ

## 1. Settings（設定システム）

### 設定ファイルの階層構造

1. **エンタープライズポリシー設定**
2. **ユーザー設定** (`~/.claude/settings.json`)
3. **プロジェクト設定** 
   - `.claude/settings.json` (バージョン管理対象)
   - `.claude/settings.local.json` (バージョン管理外)

### 主要設定項目

#### permissions（権限制御）
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test:*)",
      "Read(~/.zshrc)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

#### env（環境変数）
```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "MAX_THINKING_TOKENS": "30000",
    "ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022"
  }
}
```

#### その他の設定
- `apiKeyHelper`: カスタム認証スクリプト
- `cleanupPeriodDays`: チャット履歴保持期間
- `includeCoAuthoredBy`: GitコミットへのCo-authored-by署名

### AIT³フロー自動化への活用

**権限設定の最適化案**:
```json
{
  "permissions": {
    "allow": [
      // AIT³ワークフロー専用コマンド
      "Bash(ait3 flow:*)",
      "Bash(ait3 ticket:*)",
      
      // 安全な読み取り専用コマンド
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      
      // 開発コマンド
      "Bash(npm run test:*)",
      "Bash(npm run type-check:*)",
      "Bash(npm run build:*)",
      
      // Git操作（安全なもの）
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)"
    ],
    "deny": [
      // 危険な操作を明示的に禁止
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git reset --hard:*)"
    ]
  }
}
```

## 2. Hooks（フックシステム）

### フックの種類と実行タイミング

1. **PreToolUse**: ツール実行前
2. **PostToolUse**: ツール実行直後
3. **Notification**: 通知送信時
4. **Stop**: メインエージェント完了時
5. **SubagentStop**: サブエージェント完了時

### AIT³フロー自動化のためのフック活用

#### 1. テスト作成の適正化（RED Phase）
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/check-test-duplication.sh",
            "description": "新規テストファイル作成前に既存テストをチェック"
          }
        ]
      }
    ]
  }
}
```

#### 2. 自動フォーマット（REFACTOR Phase）
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:fix -- $FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

#### 3. ワークフロー遵守の確認
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/validate-ait3-workflow.sh",
            "description": "AIT³フローの順序を確認"
          }
        ]
      }
    ]
  }
}
```

### フックのセキュリティ考慮事項

- フックはユーザー権限で実行される
- 事前にテスト環境で検証必須
- JSONレスポンスで複雑な判断も可能

## 3. MCP（Model Context Protocol）

### MCPサーバーの種類

1. **stdio サーバー**: 標準入出力経由
2. **SSE サーバー**: Server-Sent Events
3. **HTTP サーバー**: HTTP通信

### スコープレベル

- **Local**: 現在のプロジェクトのみ
- **Project**: プロジェクト内で共有（`.mcp.json`）
- **User**: 複数プロジェクトで利用可能

### AIT³ワークフロー自動化のためのMCPサーバー

#### 1. AIT³ワークフローサーバー
```bash
claude mcp add ait3-workflow-server \
  --scope project \
  -- /path/to/ait3-mcp-server
```

#### 2. テスト管理サーバー
```bash
claude mcp add test-manager \
  --scope project \
  -- /path/to/test-manager-server \
  --test-dir ./tests
```

#### 3. チケット管理サーバー
```bash
claude mcp add ticket-server \
  --scope project \
  -- /path/to/ticket-mcp-server \
  --tickets-dir ./.tickets
```

### MCPリソース参照

```
@ait3-workflow:phase/current     # 現在のフェーズ確認
@test-manager:coverage/report    # カバレッジレポート
@ticket-server:ticket/0001       # チケット詳細
```

## 4. Slash Commands（スラッシュコマンド）

### 組み込みコマンド

- `/add-dir`: 作業ディレクトリ追加
- `/clear`: 会話履歴クリア
- `/config`: 設定表示/変更
- `/help`: ヘルプ表示
- `/review`: コードレビュー要求
- `/model`: モデル選択/変更

### カスタムコマンドの作成

#### コマンドの配置場所
- **プロジェクト固有**: `.claude/commands/`
- **個人用**: `~/.claude/commands/`

### AIT³フロー自動化のためのカスタムコマンド

#### 1. ワークフロー制御コマンド
`.claude/commands/ait3-next.md`:
```markdown
---
description: 次のAIT³フェーズに進む
---

# AIT³ Next Phase

現在のフェーズを確認して、次のフェーズに進みます。

!ait3 flow status
!ait3 flow next $ARGUMENTS
```

#### 2. テスト最適化コマンド
`.claude/commands/test-optimize.md`:
```markdown
---
description: 既存テストをチェックして最適化
---

# Test Optimization

既存のテストファイルを分析し、重複や不要なテストを特定します。

@tests/
!similarity-ts --threshold 0.8 tests/

$ARGUMENTSに関連する既存テストを修正すべきか、新規作成すべきか判断してください。
```

#### 3. チケット連携コマンド
`.claude/commands/ticket-context.md`:
```markdown
---
description: 現在のチケットコンテキストを読み込む
---

# Load Ticket Context

@.tickets/doing/
現在作業中のチケットの要件と進捗を確認し、次のアクションを提案してください。
```

## 5. AIT³フロー自動化の統合戦略

### Phase 1: 基盤整備

1. **設定最適化**
   - permissions設定でAIT³コマンドを優先許可
   - 危険なコマンドの明示的禁止

2. **基本フック実装**
   - PreToolUseでワークフロー順序チェック
   - PostToolUseで自動フォーマット

### Phase 2: 自動化強化

1. **MCPサーバー開発**
   - AIT³ワークフロー管理サーバー
   - テスト最適化サーバー
   - チケット状態管理サーバー

2. **カスタムコマンド充実**
   - フェーズ遷移の自動化
   - テスト重複チェック
   - チケットコンテキスト管理

### Phase 3: インテリジェント化

1. **高度なフック**
   - AI判断を含むフック（JSONレスポンス）
   - ワークフロー違反の自動修正

2. **統合コマンド**
   - 複数ツールを連携させた高度なコマンド
   - コンテキストアウェアな開発支援

## 他プロジェクトへのAIT³導入優先度分析

### 🏆 導入必須チケット（Priority 1）

#### #0020: ProjectAnalyzer基盤実装 ⭐⭐⭐⭐⭐
**理由**: 異なる技術スタックの自動検出が可能
- TypeScript以外の言語（Python、PHP、Ruby、Go）対応
- テスト・リンターコマンドの自動検出
- フレームワーク判定

#### #0028: ait3 install claude-md ⭐⭐⭐⭐⭐
**理由**: プロジェクト固有の設定生成
- Dependencies/Structure自動分析
- プロジェクト特性に応じたCLAUDE.md提案
- AI協調パターンの適応

#### #0029: ait3 install settings ⭐⭐⭐⭐⭐
**理由**: セキュリティとパーミッション管理
- プロジェクト固有の危険コマンド制限
- 言語別の安全なコマンド許可設定
- 環境変数の最適化

### 🔧 導入推奨チケット（Priority 2）

#### #0031: 既存コマンドガイド自動インストール ⭐⭐⭐⭐
**理由**: 必要なツールの一括セットアップ
- gemini（大規模コードベース分析）
- npm（パッケージ管理）
- orchestrator（複雑タスク分割）
- similarity-ts（重複検出）

#### #0030: .claude/CLAUDE.md永続設定 ⭐⭐⭐⭐
**理由**: AIT³原則の維持
- 言語設定（日本語/英語）
- ワークフロー基本指示
- プロジェクト横断的な設定

#### #0033: Claude Code Hooks実装 ⭐⭐⭐⭐
**理由**: 自動化とカスタマイズ
- テスト重複防止
- 自動フォーマット
- ワークフロー遵守

### 📈 導入効果を高めるチケット（Priority 3）

#### #0027: .claude設定拡張（doing） ⭐⭐⭐
**理由**: 統合的な設定管理
- コマンド一括インストール
- 設定ファイル最適化

#### #0032: code-reviewコマンドガイド ⭐⭐⭐
**理由**: コード品質向上
- AI駆動のレビュー支援
- プロジェクト固有のレビュー基準

#### #0021: ticket undoコマンド ⭐⭐
**理由**: 操作性向上
- ミスの取り消し機能
- git履歴保持

#### #0014: エッジケース対応 ⭐⭐
**理由**: 特殊状況への対応
- suspend/switch/rollback

## 🚀 推奨導入順序

### Step 1: 基盤整備（1-2週間）
1. **#0020**: ProjectAnalyzer実装
   - 多言語対応の基盤
   - 自動検出機能

2. **#0028 + #0029**: 初期設定自動化
   - `ait3 install claude-md`
   - `ait3 install settings`

### Step 2: ツール拡充（1週間）
3. **#0031**: コマンドガイド一括インストール
   - 必要なツールの自動セットアップ

4. **#0030**: 永続設定
   - .claude/CLAUDE.md設定

### Step 3: 自動化強化（1週間）
5. **#0033**: Hooks実装
   - ワークフロー自動化
   - カスタマイズ対応

## 実装優先度

### 即座に実装すべき項目

1. **settings.local.json最適化**
   ```json
   {
     "permissions": {
       "allow": ["Bash(ait3:*)", "Bash(npm run test:*)"],
       "deny": ["Bash(rm -rf:*)", "Bash(git push --force:*)"]
     },
     "env": {
       "AIT3_AUTO_MODE": "true",
       "TEST_OPTIMIZATION": "enabled"
     }
   }
   ```

2. **基本的なカスタムコマンド**
   - `/ait3-next`: 次フェーズへの遷移
   - `/test-check`: 既存テストのチェック
   - `/ticket-sync`: チケット状態同期

3. **必須フック**
   - テスト作成前の重複チェック
   - コミット前のワークフロー確認

これらの実装により、AIがAIT³フローに沿った開発を自動的に、かつ適切に実行できるようになります。