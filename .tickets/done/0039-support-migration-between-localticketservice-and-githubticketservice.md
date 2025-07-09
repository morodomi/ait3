---
id: 0039
title: Support migration between LocalTicketService and GitHubTicketService
status: done
priority: medium
created: '2025-07-09T14:29:42.028Z'
updated: '2025-07-09T22:37:45.383Z'
labels: []
started: '2025-07-09T15:51:09.946Z'
completed: '2025-07-09T22:37:45.383Z'
---
# Ticket #0039: Support migration between LocalTicketService and GitHubTicketService

## Description

LocalTicketService と GitHubTicketService 間の移行機能を実装し、チーム開発の柔軟性を向上させる。

## Why（なぜやるのか）

1. **チーム開発の柔軟性**
   - 個人開発では Local、チーム開発では GitHub Issues を使い分けたい
   - プロジェクトの成長に応じてバックエンドを変更したい

2. **既存データの保護**
   - Local で作成したチケットを GitHub に移行したい
   - GitHub で作業中のチケットを Local に戻したい

3. **データの一貫性**
   - 移行後も既存のワークフローが継続できる
   - チケット番号の重複を防ぎたい

## How（どうやるのか）

### ServiceFactory の拡張（最小限実装）

```typescript
export class ServiceFactory {
  static createServices(): Services {
    const config = this.loadConfig();
    
    return config.backend === 'github' 
      ? this.createGitHubServices(config.github)
      : this.createLocalServices();
  }
  
  private static loadConfig(): BackendConfig {
    // .tickets/config.json から backend 設定を読み込み
  }
}
```

### 移行コマンドの実装（単一コマンド）

```bash
# Local → GitHub への移行（優先実装）
ait3 migrate --from local --to github --owner user --repo project

# 移行前の検証
ait3 migrate --validate --from local --to github
```

## Structure（構造）- 最小限

```
src/
├── services/
│   ├── implementations/
│   │   └── TicketMigrationService.ts     ← 移行ロジック
│   └── interfaces/
│       └── MigrationService.ts           ← 移行インターフェース
├── commands/
│   └── migrate/
│       └── index.ts                     ← 単一移行コマンド
└── common/
    └── types.ts                         ← 移行用型定義
```

## Data Mapping Strategy

```typescript
interface MigrationMapping {
  // Local ticket.md → GitHub Issue
  localToGitHub: {
    id: string;           // 0001 → Issue #1
    title: string;        // そのまま
    description: string;  // markdown body → issue body
    status: string;       // todo/doing/done → labels
    priority: string;     // medium → priority:medium label
    labels: string[];     // そのまま
    created: string;      // ISO8601 → GitHub created_at
    assignee?: string;    // そのまま
  };
  
  // GitHub Issue → Local ticket.md
  gitHubToLocal: {
    number: number;       // Issue #1 → 0001
    title: string;        // そのまま
    body: string;         // issue body → markdown content
    labels: string[];     // status:todo → status: 'todo'
    created_at: string;   // GitHub timestamp → ISO8601
    assignee?: string;    // そのまま
  };
}
```

## Tests（テスト戦略）

### Unit Tests
- TicketMigrationService の各メソッド
- データマッピングの正確性
- エラーハンドリング

### Integration Tests
- 完全な移行ワークフロー
- ServiceFactory の backend 切り替え
- 移行前後のデータ整合性

### E2E Tests
- CLI コマンドの実行
- 進行状況表示
- ネットワークエラー処理

## Implementation Phases - 最小限

### Phase 1: 基盤実装（このチケットで実装）
1. ServiceFactory 拡張（config.json読み込み）
2. MigrationService インターフェース
3. Local → GitHub 移行ロジック
4. 単一 migrate コマンド

### 将来の拡張（別チケット）
- GitHub → Local 移行
- 双方向同期
- 進行状況表示

## Acceptance Criteria - 最小限
- [ ] ServiceFactory が config.json の backend 設定に基づいて適切なサービスを選択
- [ ] Local tickets を GitHub Issues に移行可能（一方向のみ）
- [ ] 移行前の検証機能
- [ ] IDマッピング問題の解決（既存GitHubリポジトリ対応）
- [ ] データ損失の明示と対応
- [ ] 包括的なテストカバレッジ

## Technical Requirements - 最小限
- 既存の TicketService インターフェース準拠
- 一方向移行のみ（Local → GitHub）
- 基本的なエラーハンドリング
- IDマッピング戦略（既存GitHubリポジトリ対応）
- 100% テストカバレッジ

## 重要な制約事項（Gemini分析結果）
1. **データ損失**: GitHub→Local移行時は情報が失われる（将来対応）
2. **IDマッピング**: 既存GitHubリポジトリでの番号衝突リスク
3. **一方向移行**: 双方向同期は複雑すぎるため実装しない
4. **ラベル依存**: status:todoラベルの削除/変更で移行が困難になる
