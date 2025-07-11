#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')
url=$(echo "$input_json" | jq -r '.tool_input.url // ""')
query=$(echo "$input_json" | jq -r '.tool_input.query // ""')

# WebFetchの場合
if [[ "$tool_name" == "WebFetch" ]]; then
  cat <<EOF >&2
INFO: WebFetchを使用しています。
代替案: gemini -p "@file.txt このURLの内容を確認して: $url"
※ Geminiの大規模コンテキストウィンドウを活用できます
EOF
fi

# WebSearchの場合
if [[ "$tool_name" == "WebSearch" ]]; then
  cat <<EOF >&2
INFO: WebSearchを使用しています。
代替案: gemini -p "次の検索について調べて: $query"
※ Geminiの最新情報や幅広い知識を活用できます
EOF
fi

# 警告のみなので、常に正常終了
exit 0