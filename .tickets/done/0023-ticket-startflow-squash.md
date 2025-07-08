---
id: '0023'
title: 'ワークフロー修正: ticket start順序とflow squash制約の実装'
status: done
priority: high
created: '2025-07-08T05:12:11.197Z'
updated: '2025-07-08T06:26:26.378Z'
labels:
  - refactor
  - workflow
  - git
started: '2025-07-08T05:17:26.219Z'
completed: '2025-07-08T06:26:26.378Z'
---
# Ticket #0023: ワークフロー修正: ticket start順序とflow squash制約の実装

## Description

docs/workflow.mdの想定フローと現在の実装に相違があるため、以下の修正を実施する。

## 背景

現在の実装とworkflow.mdの想定フローを調査した結果、以下の相違が判明：

### 1. ticket start の操作順序
- **現在**: Git確認 → チケット移動 → ブランチ作成
- **正しい**: Git確認 → ブランチ作成 → チケット移動
- **理由**: ブランチ作成に失敗した場合、チケットステータスを変更すべきではない

### 2. flow squash の実行条件
- **現在**: チケットステータスに関係なく実行可能
- **正しい**: ticket complete実行後のみ実行可能にすべき
- **理由**: workflow.mdでは明確に「First, complete the ticket」と記載

### 3. flow red/green/refactor でのコミット
- **現在**: 各フェーズでのgitコミット手順が不明確
- **検討**: 各フェーズ完了時のコミット手順を明示すべきか
- **例**: 
  - RED完了時: `git add . && git commit -m "test(#0023): create failing tests for feature"`
  - GREEN完了時: `git add . && git commit -m "feat(#0023): implement feature to pass tests"`
  - REFACTOR完了時: `git add . && git commit -m "refactor(#0023): optimize implementation"`

## Tasks

### 必須修正
- [ ] ticket start: ブランチ作成成功後にチケット移動する順序に変更
- [ ] flow squash: チケットがdone状態でない場合は実行を防止（エラーメッセージ表示）
- [ ] 各コマンドのテストを更新

### 検討事項
- [ ] flow red/green/refactor: 各フェーズでのgitコミット推奨手順の明示
- [ ] workflow.md の全体的な見直しと更新
- [ ] CLAUDE.md への変更内容の反映

## Technical Details

### ticket start の修正案
```typescript
// 1. Git環境確認
// 2. uncommitted changes チェック
// 3. ブランチ作成試行
// 4. ブランチ作成成功時のみチケット移動
// 5. 失敗時はチケット状態を変更せずエラー表示
```

### flow squash の修正案
```typescript
// 1. チケットステータス確認
// 2. done状態でない場合:
//    - エラー: "Please complete the ticket first: ait3 ticket complete {id}"
// 3. done状態の場合:
//    - 通常通りGitコマンド提案を表示
```

## Expected Outcome

- AIT³ワークフローの一貫性向上
- エラー時のデータ整合性保証
- ユーザーへの明確なガイダンス提供

## Design (PLANNING Phase Output)

### 実装アプローチ
1. **統一されたNext Actionフォーマット**
   - 全コマンドで構造化された出力形式を採用
   - チケットファイルの場所を常に表示
   - 各フェーズでの推奨git操作を明示

2. **ticket start の実装順序変更**
   - Git環境確認 → ブランチ作成 → チケット移動の順序に
   - ブランチ作成失敗時はチケット状態を変更しない

3. **flow squash の自動ticket complete**
   - チケットがdone状態でない場合、自動的にcompleteを実行
   - complete失敗時は処理を中断

4. **各フローフェーズでのgitコミット推奨**
   - plan: `planning(#XXX): design approach`
   - red: `test(#XXX): create failing tests`
   - green: `feat(#XXX): implement feature`
   - refactor: `refactor(#XXX): optimize implementation`

### テスト戦略
- 既存テストの修正を最小限に
- 新しい動作（ブランチ作成→チケット移動）のテスト追加
- flow squashの自動complete機能のテスト追加
