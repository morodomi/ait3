---
id: '0010'
title: 'feat: flow green command - 最小実装でテスト通過機能'
status: done
priority: high
created: '2025-07-07T09:09:51.902Z'
updated: '2025-07-07T13:00:36.746Z'
labels:
  - flow
  - tidd
  - green
  - implementation
started: '2025-07-07T12:25:11.890Z'
completed: '2025-07-07T13:00:36.746Z'
---
# Ticket #0010: feat: flow green command - 最小実装でテスト通過機能

## Description

AIT³ワークフローのGREEN Phaseを実装。失敗しているテストを通過させるための最小限の実装を生成し、100%テスト合格を実現する。

## Requirements

- flow red commandで生成された失敗テストを解析
- テストを通過させるための最小限の実装を生成
- 既存のコードパターンとアーキテクチャに従う
- 100%テスト合格率を達成
- 実装の進捗状況をリアルタイムで表示

## Architecture Decision

### テストファースト原則の厳守（Gemini分析に基づく）
**決定**: watchモードは実装せず、テストの不可侵性を最優先とする

**理由**:
1. TDDの「Red→Green→Refactor」サイクルのGreenフェーズに完全に忠実
2. テストを「実装が満たすべき契約」として扱う
3. AIT³の「規律ある開発プロセス」哲学と完全に一致

### 手戻りプロセスの明確化
テストに問題がある場合のワークフロー：
1. greenフェーズでの作業を中断
2. redフェーズ（またはplanフェーズ）に公式にロールバック
3. テストを修正し、`flow red`で再生成
4. 改めてgreenフェーズを開始

## Command Interface

```bash
# 基本使用
ait3 flow green <ticketId>

# オプション
ait3 flow green <ticketId> --target <test-file>  # 特定のテストファイルのみ対象
ait3 flow green <ticketId> --verbose             # 詳細な進捗表示
ait3 flow green <ticketId> --strict              # テスト変更の検出と警告（デフォルト: true）
```

## Acceptance Criteria

- [ ] チケットIDから関連する失敗テストを特定
- [ ] テストを解析して必要な実装を推測
- [ ] 最小限のコードで100%テスト合格を達成
- [ ] テストファイルの変更を検出し警告（--strictモード）
- [ ] 進捗状況のリアルタイム表示
- [ ] 既存のアーキテクチャパターンに準拠
- [ ] テストの意図を正確に理解し実装に反映

## Implementation Notes

### 重要な原則
1. **テストは絶対に変更しない** - テストファーストの原則を厳守
2. **100%テスト合格を目指す** - 妥協なし
3. **テストの意図を理解する** - 期待値とテストの目的を正確に把握

### 警告メッセージ例
```
⚠️ WARNING: Test file modification detected!
   File: tests/commands/flow/user-auth.test.ts
   
   In GREEN phase, tests should not be modified.
   If tests need changes, please:
   1. Stop current green phase
   2. Go back to RED phase
   3. Fix tests and regenerate
   
   Continue anyway? (not recommended) [y/N]
```

### 進捗表示例
```
🟢 GREEN Phase - Making tests pass for ticket #0010

📊 Test Progress:
├─ Total: 27 tests
├─ Passing: 15 (↑ from 0)
├─ Failing: 12
└─ Progress: ████████░░░░░░░░ 55%

✅ Implemented:
├─ createUser function
├─ validateEmail function
└─ hashPassword function

🔄 Currently working on: authenticateUser function

💡 Next: generateJWT function
```
