---
id: 0009
title: 'feat: flow red command - 失敗テスト作成支援機能'
status: doing
priority: high
created: '2025-07-07T09:09:45.389Z'
updated: '2025-07-07T11:15:10.608Z'
labels:
  - flow
  - tidd
  - red
  - testing
started: '2025-07-07T11:15:10.608Z'
---
# Ticket #0009: feat: flow red command - 失敗テスト作成支援機能

## Description

AIT³ワークフローのRED Phaseを実装。チケット要件に基づいて失敗テストを自動生成し、TDD開発を支援する。

## Command Interface

```bash
# 基本使用
ait3 flow red <ticketId>

# オプション指定
ait3 flow red <ticketId> --type unit       # ユニットテストのみ生成
ait3 flow red <ticketId> --type integration # 統合テストのみ生成
ait3 flow red <ticketId> --type both       # 両方生成（デフォルト）
ait3 flow red <ticketId> --interactive     # 対話モードでカスタマイズ
```

## Architecture Decision

### テスト配置戦略
**現行方式を継続**（将来的にハイブリッド方式へ移行予定）：
- **ユニットテスト**: `tests/commands/flow/red.test.ts`
- **統合テスト**: `tests/integration/cli/flow/red.integration.test.ts`

**注記**: Gemini分析によりハイブリッド方式が推奨されたが、既存コードベースとの一貫性を保つため、このチケットでは現行のtestsフォルダ配置を維持。ハイブリッド方式への移行は別チケットで対応予定。

## Acceptance Criteria

- [ ] チケットIDから要件と受け入れ条件を読み取り、対応するテストを生成
- [ ] 生成されたすべてのテストが0%合格率（すべて赤）
- [ ] 既存のテストパターンに従った構造で生成
- [ ] ユニットテストと統合テストの両方をサポート
- [ ] 対話モードでテストケースをカスタマイズ可能
- [ ] Vitestフレームワークのみサポート（他フレームワークは将来対応）
- [ ] 生成されたテストファイルのパスを表示
- [ ] --dry-runオプションで生成内容のプレビューが可能

## Technical Requirements

### ファイル構造
```typescript
// src/commands/flow/red.ts
export interface RedArgs {
  ticketId: string;
  type?: 'unit' | 'integration' | 'both';
  interactive?: boolean;
  dryRun?: boolean;
}

export async function redPhase(
  args: RedArgs,
  services: Services
): Promise<CLIResult>
```

### 主要機能
1. **チケット解析**
   - チケットから要件と受け入れ条件を抽出
   - ラベルからテストタイプを推測
   - 説明文からテストケースを識別

2. **テスト生成パターン**
   - 既存コードのパターンを分析
   - 適切なdescribe/itブロックを生成
   - 必ず失敗するアサーションを含める

3. **対話モード**
   - 生成されるテストケースの確認
   - カスタムテストケースの追加
   - エッジケースの提案

### サービス依存
- TicketService: チケット情報の取得
- FileService: テストファイルの作成（将来実装）
- ProjectAnalysisService: 既存パターンの分析

## Implementation Notes

1. **テスト配置**:
   - このチケットでは現行のtestsフォルダ構造を維持
   - ハイブリッド方式への移行は別チケット（#0013）で対応

2. **エラーハンドリング**:
   - チケットが見つからない場合
   - テストファイルが既に存在する場合
   - 無効なチケット状態の場合

3. **生成されるテストの品質**:
   - 必ず失敗するアサーションを含める
   - 既存のテストパターンを踏襲
   - チケットの受け入れ条件を反映
