---
id: '0015'
title: 各フェーズの提案内容見直し - plan/red/green/refactor
status: done
priority: medium
created: '2025-07-07T13:20:49.673Z'
updated: '2025-07-08T02:12:59.523Z'
labels:
  - improvement
  - flow
started: '2025-07-07T23:06:07.759Z'
completed: '2025-07-08T02:12:59.523Z'
---
# Ticket #0015: 各フェーズの提案内容見直し - plan/red/green/refactor

## Description

AIT³フローの各フェーズで提示される内容の見直しと改善。

## Scope

- CREATE/START: チケット作成・開始時の案内改善
- PLAN: 提案内容の改善（分析項目追加、Gemini任意化）
- RED: テストファイル作成ガイダンスの改善
- GREEN: 実装ガイダンスの改善（テスト変更ポリシー明確化）
- REFACTOR: リファクタリング提案の改善（言語非依存化）
- SQUASH: Gitコマンド提示とticket complete分離

## Implementation Plan

### Phase 1: 提示内容の設計
- [x] 各フェーズの役割と責任範囲の明確化
- [x] Claude Codeへの具体的な指示内容の検討
- [x] 人間の介入ポイントの最適化（PLAN承認後は任意）

### Phase 2: Gemini分析
- [x] 提示内容の批判的分析
- [x] フロー全体の一貫性確認
- [x] 改善提案の取り込み

### Phase 3: 実装内容
- [x] workflow.mdの更新
- [x] エラーハンドリングの汎用例追加
- [ ] flow squashでのticket complete自動実行は将来対応

## Notes

- チケット#0016と統合（重複していたため削除）
- チーム開発向け機能は将来対応として分離
- 本チケットは提示内容の調整に限定
