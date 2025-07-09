---
id: 0038
title: Implement GitHubTicketService for GitHub Issues integration
status: done
priority: medium
created: '2025-07-09T14:29:29.143Z'
updated: '2025-07-09T15:45:59.089Z'
labels: []
started: '2025-07-09T14:30:59.324Z'
completed: '2025-07-09T15:45:59.089Z'
---
# Ticket #0038: Implement GitHubTicketService for GitHub Issues integration

## Description

AIT³のチケットシステムをGitHub Issuesと統合し、チーム開発に対応する。

## Implementation Plan

### 1. 認証戦略
- GitHub CLI (gh) の認証を再利用
- `gh auth token`でトークン取得
- セキュアで実装がシンプル

### 2. コマンド体系

#### `ait3 setup ticket github`
- チケットバックエンドをGitHubに設定
- 処理フロー：
  1. `gh`コマンドの存在確認
  2. `gh auth status`で認証状態チェック
  3. 未認証時は`gh auth login`を案内
  4. `.tickets/config.json`を更新

#### `ait3 init github`
- GitHubリポジトリをAIT³用に初期化
- 処理内容：
  1. `.github/`ディレクトリ作成
  2. Issueテンプレート配置
  3. 必要なラベル作成（status:todo/doing/done）

### 3. 状態マッピング
- todo → open + status:todo ラベル
- doing → open + status:doing ラベル
- done → closed + status:done ラベル

### 4. 実装優先順位
1. `setup ticket github`コマンド
2. GitHubTicketServiceの基本実装
3. `init github`コマンド
4. マイグレーションツール（別チケット #0039）

### 5. 技術的考慮事項
- ServiceFactoryで設定に基づくサービス切り替え
- @octokit/restでGitHub API操作
- エラーハンドリングとリトライ戦略
- GitHub APIレート制限への対応
