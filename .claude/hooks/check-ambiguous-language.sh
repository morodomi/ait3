#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
content=$(echo "$input_json" | jq -r '.tool_input.new_string // .tool_input.content // ""')
file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // ""')

# コードファイルのみチェック（README等は除外）
if [[ ! "$file_path" =~ \.(ts|js|py|java|go)$ ]]; then
  exit 0
fi

ambiguous_patterns="probably|might|maybe|perhaps|たぶん|かもしれない|おそらく|思われる"

if echo "$content" | grep -qiE "$ambiguous_patterns"; then
  detected=$(echo "$content" | grep -oiE "$ambiguous_patterns" | head -1)
  cat <<EOF >&2
WARNING: 曖昧な表現が検出されました: '$detected'
ファイル: $file_path
推奨: 明確で断定的な表現を使用してください。
EOF
  # 警告のみ（exit 0でブロックしない）
fi

# "something went wrong" チェック
if echo "$content" | grep -qi "something went wrong"; then
  cat <<EOF >&2
ERROR: 曖昧なエラーメッセージです。
検出: "something went wrong"
代替案: 具体的なエラー内容を記載してください
例: "Failed to connect to database (timeout after 30s)"
EOF
  exit 1
fi

exit 0