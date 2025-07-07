---
id: '0011'
title: 'feat: flow refactor command - コード最適化機能'
status: done
priority: high
created: '2025-07-07T09:09:58.943Z'
updated: '2025-07-07T13:38:24.740Z'
labels:
  - flow
  - tidd
  - refactor
  - optimization
started: '2025-07-07T13:06:22.917Z'
completed: '2025-07-07T13:38:24.740Z'
---
# Ticket #0011: feat: flow refactor command - コード最適化機能

## Description

REFACTORフェーズのコマンド実装。他のフェーズ（plan, red, green）と同様に、実際のリファクタリングは行わず、分析結果と提案を構造化テキストで出力する。

## 実装方針

1. **提案出力型の実装**
   - コード分析を実行
   - リファクタリング提案を生成
   - 構造化マークダウンで出力
   - 実際の変更は行わない

2. **主な分析項目**
   - コード重複の検出
   - モック実装の特定
   - 型定義の改善点
   - コード構造の最適化案

3. **出力フォーマット**
   - AI/人間が読みやすい構造
   - 具体的なファイル位置を含む
   - 次のアクションを明示
