---
id: '0013'
title: 'refactor: ハイブリッドテスト配置への移行 - ユニットテストをコロケーション化'
status: todo
priority: medium
created: '2025-07-07T11:31:30.906Z'
updated: '2025-07-07T11:31:30.906Z'
labels: []
---
# Ticket #0013: refactor: ハイブリッドテスト配置への移行 - ユニットテストをコロケーション化

## Description

Gemini分析に基づき、ハイブリッドテスト配置方式へ移行。ユニットテストを実装コードと隣接配置することで、開発者体験(DX)とTDDワークフローの効率を大幅に向上させる。

## Background

チケット#0009のPLANNINGフェーズでGeminiが強く推奨：
- 開発者体験(DX)の大幅向上
- AIT³のTDD哲学との高い親和性
- 論理的な責務分離

## Migration Plan

### Phase 1: 設定変更
- `tsconfig.json`: `**/*.test.ts`をexcludeに追加
- `vitest.config.ts`: srcとtests両方のテストを対象に設定

### Phase 2: テストファイル移行
**移行対象**:
- `tests/commands/**/*.test.ts` → `src/commands/**/*.test.ts`
- `tests/services/**/*.test.ts` → `src/services/**/*.test.ts`

**維持**:
- `tests/integration/**` - 統合テストはそのまま

### Phase 3: CI/CD更新
- GitHub Actionsのテスト実行パスを更新
- カバレッジレポートの設定調整

## Expected Structure

```
src/
├── commands/
│   ├── ticket/
│   │   ├── create.ts
│   │   ├── create.test.ts      # ユニットテスト隣接
│   │   ├── list.ts
│   │   └── list.test.ts
│   └── flow/
│       ├── plan.ts
│       └── plan.test.ts
├── services/
│   ├── implementations/
│   │   ├── LocalTicketService.ts
│   │   └── LocalTicketService.test.ts
tests/
└── integration/                 # 統合テストのみ
    └── cli/
        ├── ticket/
        └── flow/
```

## Benefits

1. **開発効率**: テストと実装の切り替えが瞬時
2. **保守性**: 機能単位でファイルがまとまる
3. **発見性**: テストの存在が一目瞭然
4. **リファクタリング**: ファイル移動が簡単

## Risks & Mitigation

- **リスク**: 移行中のテスト実行失敗
- **対策**: 段階的移行とCI確認

## Dependencies

- チケット#0009完了後に着手推奨
