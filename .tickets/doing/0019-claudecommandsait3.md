---
id: 0019
title: .claude/commands/ait3カスタムコマンドファイル作成
status: doing
priority: high
created: '2025-07-08T01:59:17.644Z'
updated: '2025-07-08T03:08:30.132Z'
labels:
  - claude-code
  - integration
  - documentation
started: '2025-07-08T03:08:30.132Z'
---
# Ticket #0019: .claude/commands/ait3カスタムコマンドファイル作成

## Description

Claude Codeが AIT³ コマンドを効果的に使用できるようにするためのガイドファイル `.claude/commands/ait3` を作成し、インストールコマンドを実装する。

## Acceptance Criteria
- [ ] `ait3 install command ait3` コマンドで `.claude/commands/ait3` ファイルを作成
- [ ] `ait3 install command` コマンドですべてのコマンドファイルをインストール（デフォルト動作）
- [ ] 既存ファイルがある場合は上書き確認
- [ ] `.claude/` ディレクトリが存在しない場合は自動作成
- [ ] インストール結果を分かりやすく表示

## Technical Requirements
- installコマンドグループの実装（`src/commands/install/`）
- commandサブコマンドの実装
- ait3コマンドガイドテンプレートの作成（`src/assets/commands/ait3.md`）
- 純関数アーキテクチャの維持
- コロケーションによるテスト配置

## Implementation Plan

### コマンド構造
```bash
ait3 install command              # すべてのコマンド（デフォルト）
ait3 install command all          # すべてのコマンド（明示的）
ait3 install command ait3         # ait3コマンドガイドのみ
ait3 install command orchestrator # orchestratorガイド（将来）
ait3 install command gemini       # geminiガイド（既存）
```

### ファイル構造
```
src/
├── commands/
│   └── install/
│       ├── index.ts          # installコマンドグループ
│       ├── command.ts        # commandサブコマンド
│       └── command.test.ts   # テスト（コロケーション）
├── assets/
│   └── commands/
│       └── ait3.md          # ait3コマンドガイドテンプレート
└── services/
    └── implementations/
        └── FileService.ts    # ファイル操作サービス（必要に応じて）
```

## Notes
- CLAUDE.mdの更新も必要（`ait3 install all` → `ait3 install command all`）
- 将来的にはhooksやその他のインストール機能も追加予定
