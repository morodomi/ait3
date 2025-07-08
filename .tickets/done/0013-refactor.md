---
id: '0013'
title: 'refactor: ハイブリッドテスト配置への移行 - ユニットテストをコロケーション化'
status: done
priority: medium
created: '2025-07-07T11:31:30.906Z'
updated: '2025-07-07T22:30:57.694Z'
labels: []
started: '2025-07-07T15:19:24.147Z'
completed: '2025-07-07T22:30:57.694Z'
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

---

## PLANNING Phase Results (2025-07-07)

### Gemini Analysis Summary

Gemini分析により、コロケーション化の具体的な実行計画が確定。主要な推奨事項：

1. **ユニットテストのみ移行**: `*.test.ts` → `src/` 内の対応する場所
2. **インテグレーションテスト維持**: `tests/integration/**/*.integration.test.ts` はそのまま
3. **ビルド汚染防止**: `tsconfig.json` で `src/**/*.test.ts` を exclude

### Detailed Implementation Plan

#### Phase 1: 設定ファイル更新

**`vitest.config.ts`** - テスト発見パターン追加:
```typescript
test: {
  include: [
    'src/**/*.test.ts',           // ユニットテスト（コロケーション）
    'tests/integration/**/*.integration.test.ts'  // インテグレーション（維持）
  ],
  globals: true,
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      '**/*.config.*',
      '**/mockData.ts',
      'src/**/*.test.ts',      // コロケーションテストはカバレッジ除外
      'tests/**'
    ]
  }
}
```

**`tsconfig.json`** - ビルド汚染防止:
```json
{
  "exclude": [
    "node_modules", 
    "dist", 
    "src/**/*.test.ts"    // テストファイルをビルドから除外
  ]
}
```

#### Phase 2: ファイル移行（17ファイル）

**移行対象ユニットテスト**:
- `tests/commands/flow/green.test.ts` → `src/commands/flow/green.test.ts`
- `tests/commands/flow/plan.test.ts` → `src/commands/flow/plan.test.ts`
- `tests/commands/flow/red.test.ts` → `src/commands/flow/red.test.ts`
- `tests/commands/flow/refactor.test.ts` → `src/commands/flow/refactor.test.ts`
- `tests/commands/flow/squash.test.ts` → `src/commands/flow/squash.test.ts`
- `tests/commands/ticket/*.test.ts` → `src/commands/ticket/*.test.ts`
- `tests/services/**/*.test.ts` → `src/services/**/*.test.ts`

**維持対象インテグレーションテスト** (18ファイル):
- `tests/integration/**/*.integration.test.ts` - 変更なし

#### Phase 3: インポートパス修正

**問題**: 相対パス (`../../../`) の破損
**解決策**: 
1. エイリアス活用: `@/` パスに統一
2. 各テストファイルのインポート文を相対パスから絶対パスに変更

**例**:
```typescript
// Before (相対パス)
import { planPhase } from '../../../src/commands/flow/plan.js';

// After (エイリアス使用)
import { planPhase } from '@/commands/flow/plan.js';
```

#### Phase 4: 動作確認

1. **テスト実行**: `npm test` - 全テストがパスすることを確認
2. **ビルド確認**: `npm run build` - distディレクトリにテストファイルが含まれないことを確認
3. **カバレッジ確認**: `npm run test:coverage` - カバレッジレポートが正常に生成されることを確認

### Implementation Risks & Mitigation

1. **インポートパス破損**
   - **リスク**: 移行時の相対パス全破損
   - **対策**: エイリアス統一 + 段階的テスト実行

2. **ビルド汚染**
   - **リスク**: dist/ にテストコードが混入
   - **対策**: tsconfig.json exclude 設定 + ビルド確認

3. **CI/CD影響**
   - **リスク**: GitHub Actions でのテスト実行失敗
   - **対策**: ローカル動作確認後にCI実行

### Success Metrics

- [ ] 全ユニットテスト (17ファイル) が src/ 内にコロケーション化
- [ ] 全インテグレーションテスト (18ファイル) が tests/integration/ に維持
- [ ] 310テスト全てがパス (100% success rate 維持)
- [ ] dist/ ディレクトリにテストファイルが含まれない
- [ ] カバレッジレポートが正常に生成される
