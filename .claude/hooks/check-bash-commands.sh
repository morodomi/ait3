#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# 入力JSON読み込み
input_json=$(cat)

# コマンド抽出
command=$(echo "$input_json" | jq -r '.tool_input.command // ""')

# プロジェクトルートディレクトリを取得（gitリポジトリのルート）
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# sudo チェック（最優先でブロック）
if [[ "$command" =~ ^sudo[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'sudo' コマンドはブロックされました。
理由: AIに権限昇格を許可することはできません。
代替案: 必要なコマンドを提示しますので、手動で実行してください。
EOF
  exit 1
fi

# rm コマンドチェック
if [[ "$command" =~ ^rm[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'rm' コマンドはブロックされました。
代替案: Claude Codeのコンソールで '! rm' を使って手動実行してください。
例: ! rm -rf /path/to/directory
EOF
  exit 1
fi

# chmod チェック
if [[ "$command" =~ ^chmod[[:space:]] ]]; then
  # 特に危険なパターン
  if [[ "$command" =~ chmod[[:space:]]+777 ]] || [[ "$command" =~ chmod[[:space:]]+\+s ]]; then
    cat <<EOF >&2
ERROR: 危険な 'chmod' コマンドがブロックされました。
検出: $command
理由: セキュリティリスクが高い権限設定です。
代替案: 必要な権限のみを設定してください。
  - 実行可能: chmod +x または chmod 755
  - 読み取り専用: chmod 644
EOF
  else
    cat <<EOF >&2
ERROR: 'chmod' コマンドはブロックされました。
代替案: 権限変更が必要な場合は、以下を手動で実行してください。
  - スクリプトを実行可能に: chmod +x filename
  - 通常のファイル権限: chmod 644 filename
EOF
  fi
  exit 1
fi

# chown チェック
if [[ "$command" =~ ^chown[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'chown' コマンドはブロックされました。
理由: 所有者変更は管理者権限が必要な操作です。
代替案: 必要に応じて手動で実行してください。
EOF
  exit 1
fi

# dd チェック
if [[ "$command" =~ ^dd[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'dd' コマンドはブロックされました。
理由: ディスクレベルの操作は破壊的な可能性があります。
代替案: 通常のファイルコピーには 'cp' を使用してください。
EOF
  exit 1
fi

# ln チェック（シンボリックリンク）
if [[ "$command" =~ ^ln[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'ln' コマンドはブロックされました。
理由: シンボリックリンクはセキュリティリスクになる可能性があります。
代替案: 必要に応じて手動で作成してください。
EOF
  exit 1
fi

# mv/cp のプロジェクト外チェック
if [[ "$command" =~ ^(mv|cp)[[:space:]] ]]; then
  # コマンドから対象パスを抽出（簡易的）
  target_path=$(echo "$command" | awk '{print $NF}')
  
  # 絶対パスまたは親ディレクトリ参照を含む場合
  if [[ "$target_path" =~ ^/ ]] || [[ "$target_path" =~ \.\. ]]; then
    # プロジェクトディレクトリ外への操作をチェック
    if [[ ! "$target_path" =~ ^$PROJECT_ROOT ]]; then
      cat <<EOF >&2
ERROR: プロジェクトディレクトリ外への操作がブロックされました。
コマンド: $command
理由: プロジェクト外へのファイル操作は許可されていません。
代替案: プロジェクト内でのみファイル操作を行ってください。
EOF
      exit 1
    fi
  fi
fi

# /dev/ への書き込みチェック
if [[ "$command" =~ \>[[:space:]]*/dev/ ]] || [[ "$command" =~ \>\>[[:space:]]*/dev/ ]]; then
  # /dev/null は許可
  if [[ ! "$command" =~ /dev/null ]]; then
    cat <<EOF >&2
ERROR: デバイスファイルへの書き込みがブロックされました。
検出: $command
理由: デバイスファイルへの直接書き込みは危険です。
許可: /dev/null への出力のみ許可されています。
EOF
    exit 1
  fi
fi

# curl/wget チェック
if [[ "$command" =~ ^(curl|wget)[[:space:]] ]]; then
  cat <<EOF >&2
ERROR: 'curl'/'wget' コマンドはブロックされました。
代替案1: gemini -p "@file.txt URLの内容を確認して: <URL>"
代替案2: WebFetch ツールを使用してください
EOF
  exit 1
fi

# git commit チェック
if [[ "$command" =~ ^git[[:space:]]commit ]]; then
  if ! [[ "$command" =~ -m[[:space:]]*\"(feat|fix|docs|style|refactor|test|chore)(\(#[0-9]+\))?:[[:space:]] ]]; then
    cat <<EOF >&2
ERROR: コミットメッセージが不適切です。
形式: type(#ticket): description
例: feat(#93): implement hook system
EOF
    exit 1
  fi
fi

exit 0