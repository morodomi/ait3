---
id: '0014'
title: 'feat: エッジケース対応 - suspend/switch/rollback機能'
status: todo
priority: medium
created: '2025-07-07T12:43:11.308Z'
updated: '2025-07-07T12:43:11.308Z'
labels:
  - flow
  - edge-case
  - workflow
---
# Ticket #0014: feat: エッジケース対応 - suspend/switch/rollback機能

## Description

AIT³ワークフローのエッジケース対応。コアフロー（plan→red→green→refactor→squash）完成後に実装する高度な機能群。

## Background

コアフローの実装を優先し、このチケットは後回しにすることを決定（Gemini分析により妥当性確認済み）。

## Scope

### 1. Suspend/Resume機能
- 作業中のフェーズを一時中断
- 状態を保存して後で再開可能に
- 例: `ait3 flow suspend` → `ait3 flow resume`

### 2. Switch機能
- 複数チケット間の切り替え
- 各チケットの作業状態を保持
- Gitブランチとの連携

### 3. Rollback機能
- 前のフェーズに戻る
- 例: GREENからREDへの正式な手戻り
- 作業履歴の管理

### 4. テスト修正フロー
- GREENフェーズでテスト修正が必要な場合の正式プロセス
- --strictモードとの連携
- 警告とユーザー確認フロー

## Dependencies

- チケット#0010, #0011, #0012の完了が前提
- コアフローが安定動作していること

## Priority

Medium（コアフロー完成後に着手）
