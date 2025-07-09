---
id: '0033'
title: Claude Code Hooks実装 - AIT³フロー自動化支援
status: todo
priority: medium
created: '2025-07-08T13:28:03.967Z'
updated: '2025-07-08T13:28:03.967Z'
labels: []
---
# Ticket #0033: Claude Code Hooks実装 - AIT³フロー自動化支援

## Description

Claude CodeのHooksシステムを活用し、AIT³フローに沿った自動開発を支援するフックを実装する。現状の課題（過剰なテスト作成、既存テスト修正の回避、方向性のブレ）を解決する。

## 背景・課題

### 現状の問題点
1. **過剰なテスト作成**: 既存テストで十分な場合でも新規テストファイルを作成
2. **既存テスト修正の回避**: 機能修正時に既存テストを更新せず新規作成
3. **方向性のブレ**: AIT³フローの順序が守られない場合がある

### Hooksシステムの活用
- **PreToolUse**: ツール実行前の検証・ブロック
- **PostToolUse**: ツール実行後の後処理
- ユーザー権限で実行されるシェルコマンド

## 主要機能

### 1. テスト作成最適化フック（PreToolUse）
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write",
      "hooks": [{
        "type": "command",
        "command": "scripts/hooks/check-test-duplication.sh",
        "description": "新規テストファイル作成前に既存テストをチェック"
      }]
    }]
  }
}
```

**スクリプト機能**:
- テストファイル作成時に既存テストを分析
- 重複や類似テストを検出
- 既存テスト修正を推奨

### 2. 自動フォーマットフック（PostToolUse）
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "scripts/hooks/auto-format.sh"
      }]
    }]
  }
}
```

**スクリプト機能**:
- ファイル変更後の自動整形
- lintエラーの自動修正
- コードスタイル統一

### 3. AIT³ワークフロー検証フック（PreToolUse）
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "scripts/hooks/validate-ait3-workflow.sh",
        "description": "AIT³フローの順序を確認"
      }]
    }]
  }
}
```

**スクリプト機能**:
- 現在のフェーズ確認
- 不適切なコマンド実行の警告
- 正しいフェーズ遷移の提案

### 4. コミット前検証フック（PreToolUse）
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash(git commit:*)",
      "hooks": [{
        "type": "command",
        "command": "scripts/hooks/pre-commit-validation.sh"
      }]
    }]
  }
}
```

**スクリプト機能**:
- テストパス率100%確認
- lintエラーチェック
- AIT³フェーズ適合性確認

## Acceptance Criteria

- [ ] テスト重複チェックスクリプト実装
- [ ] 自動フォーマットスクリプト実装
- [ ] ワークフロー検証スクリプト実装
- [ ] コミット前検証スクリプト実装
- [ ] `/hooks`コマンドでの設定手順書作成
- [ ] 各フックの単体テスト実装
- [ ] 統合テスト実装
- [ ] settings.jsonへの適用方法ドキュメント

## Technical Requirements

### スクリプト構造
```bash
scripts/
└── hooks/
    ├── check-test-duplication.sh
    ├── auto-format.sh
    ├── validate-ait3-workflow.sh
    ├── pre-commit-validation.sh
    └── lib/
        └── common.sh  # 共通関数
```

### 出力形式
- **通常**: 標準出力でメッセージ
- **エラー**: 標準エラー出力 + exit 1でブロック
- **JSON対応**: 複雑な判断が必要な場合

### 環境変数
```bash
# フックに渡される環境変数
TOOL_NAME      # 実行されるツール名
TOOL_INPUT     # ツールへの入力
FILE_PATH      # 対象ファイルパス
PROJECT_ROOT   # プロジェクトルート
```

## Implementation Strategy

### Phase 1: 基本スクリプト実装
- 共通ライブラリ作成
- 各フックスクリプトの基本機能

### Phase 2: 高度な検証機能
- similarity-ts統合
- AIT³フロー状態管理
- 詳細なレポート生成

### Phase 3: 設定と統合
- `/hooks`コマンドでの設定
- settings.json更新
- ドキュメント整備

## Dependencies

- similarity-ts（テスト重複検出）
- npm scripts（lint、test実行）
- git（状態確認）
- jq（JSON処理、オプション）

## Notes

### セキュリティ考慮事項
- スクリプトはユーザー権限で実行
- 入力値の適切なエスケープ必須
- テスト環境での十分な検証

### パフォーマンス考慮事項
- フックは同期実行のため高速化重要
- 大規模プロジェクトでの動作確認
- キャッシュ機構の検討

### 拡張性
- 新規フックの追加が容易な設計
- プロジェクト固有のカスタマイズ対応
- MCPサーバーとの将来的な統合
