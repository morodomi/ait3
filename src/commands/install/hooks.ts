import { Command } from 'commander';
import type { CLIResult, Services } from '../../common/types.js';
import { join } from 'path';
import { mkdir, writeFile, access, chmod } from 'fs/promises';
import { STYLES } from '../../common/styles.js';

export interface InstallHooksArgs {
  targetDir?: string;
  force?: boolean;
}

export async function installHooks(
  args: InstallHooksArgs,
  _services: Services
): Promise<CLIResult> {
  const { targetDir = '.', force = false } = args;
  
  const hooksDir = join(targetDir, '.claude', 'hooks');
  const messages: string[] = [];
  let installedCount = 0;
  let skippedCount = 0;
  let hasExistingFile = false;

  try {
    // Create hooks directory
    try {
      await access(hooksDir);
    } catch {
      await mkdir(hooksDir, { recursive: true });
      messages.push(`${STYLES.success('SUCCESS:')} Created directory: ${STYLES.info(hooksDir)}`);
    }

    // Settings file goes in .claude/, hook scripts go in .claude/hooks/
    const settingsFile = { name: 'settings.json', content: getSettingsTemplate(), dir: join(targetDir, '.claude') };
    const hookScripts = [
      { name: 'check-bash-commands.sh', content: getBashCommandsTemplate(), dir: hooksDir },
      { name: 'check-ambiguous-language.sh', content: getAmbiguousLanguageTemplate(), dir: hooksDir },
      { name: 'check-web-tools.sh', content: getWebToolsTemplate(), dir: hooksDir }
    ];

    const filesToCreate = [settingsFile, ...hookScripts];

    // Process each file
    for (const file of filesToCreate) {
      const filePath = join(file.dir, file.name);
      
      // Create directory if needed
      try {
        await access(file.dir);
      } catch {
        await mkdir(file.dir, { recursive: true });
        messages.push(`${STYLES.success('SUCCESS:')} Created directory: ${STYLES.info(file.dir)}`);
      }
      
      // Check if file exists
      let shouldWrite = true;
      try {
        await access(filePath);
        hasExistingFile = true;
        if (!force) {
          shouldWrite = false;
          messages.push(`${STYLES.warning('⚠')} Skipped: ${STYLES.info(filePath)} already exists (use --force to overwrite)`);
          skippedCount++;
        } else {
          messages.push(`${STYLES.warning('⚠')} Overwriting existing file: ${STYLES.info(filePath)}`);
        }
      } catch {
        // File doesn't exist, good to proceed
      }

      if (shouldWrite) {
        await writeFile(filePath, file.content, 'utf-8');
        
        // Make shell scripts executable
        if (file.name.endsWith('.sh')) {
          await chmod(filePath, 0o755);
        }
        
        messages.push(`${STYLES.success('SUCCESS:')} Installed: ${STYLES.info(filePath)}`);
        installedCount++;
      }
    }

    // Check if we have existing files and didn't install anything
    if (hasExistingFile && !force && installedCount === 0) {
      return {
        success: false,
        message: `${STYLES.danger('ERROR:')} Hook system already exists. Use --force to overwrite.\n\n${messages.join('\n')}`
      };
    }

    // Summary
    messages.push('');
    messages.push(`${STYLES.success('SUCCESS: Hook system installed')}: ${installedCount} file(s) ${force && hasExistingFile ? 'overwritten' : 'created'}${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`);
    messages.push('');
    messages.push(`${STYLES.info('INFO:')} Hook system ready for AI safety and quality control`);
    messages.push(`${STYLES.info('LOCATION:')} ${hooksDir}`);

    return {
      success: true,
      message: messages.join('\n')
    };

  } catch (error) {
    return {
      success: false,
      message: `${STYLES.danger('ERROR: Failed to create')} hook system in ${hooksDir}\n${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function getSettingsTemplate(): string {
  return JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/check-bash-commands.sh'
            }
          ]
        },
        {
          matcher: 'Edit|Write|MultiEdit',
          hooks: [
            {
              type: 'command', 
              command: '.claude/hooks/check-ambiguous-language.sh'
            }
          ]
        },
        {
          matcher: 'WebFetch|WebSearch',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/check-web-tools.sh'
            }
          ]
        }
      ]
    }
  }, null, 2);
}

function getBashCommandsTemplate(): string {
  return `#!/bin/bash
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
  if [[ "$command" =~ chmod[[:space:]]+777 ]] || [[ "$command" =~ chmod[[:space:]]+\\+s ]]; then
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
  if [[ "$target_path" =~ ^/ ]] || [[ "$target_path" =~ \\.\\. ]]; then
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
if [[ "$command" =~ \\>[[:space:]]*/dev/ ]] || [[ "$command" =~ \\>\\>[[:space:]]*/dev/ ]]; then
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
  if ! [[ "$command" =~ -m[[:space:]]*\\"(feat|fix|docs|style|refactor|test|chore)(\\(#[0-9]+\\))?:[[:space:]] ]]; then
    cat <<EOF >&2
ERROR: コミットメッセージが不適切です。
形式: type(#ticket): description
例: feat(#93): implement hook system
EOF
    exit 1
  fi
fi

exit 0`;
}

function getAmbiguousLanguageTemplate(): string {
  return `#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
content=$(echo "$input_json" | jq -r '.tool_input.new_string // .tool_input.content // ""')
file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // ""')

# コードファイルのみチェック（README等は除外）
if [[ ! "$file_path" =~ \\.(ts|js|py|java|go)$ ]]; then
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

exit 0`;
}

function getWebToolsTemplate(): string {
  return `#!/bin/bash
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
exit 0`;
}

export const hooksCommand = new Command('hooks')
  .description('Install AI safety and quality control hook system')
  .option('-f, --force', 'Overwrite existing hook files', false)
  .action(async (options: { force: boolean }) => {
    const args: InstallHooksArgs = { force: options.force };
    
    try {
      // Create minimal services object for this command
      // Note: This command doesn't actually use services, but maintains interface consistency
      const services: Services = {
        ticketService: {} as Services['ticketService'],
        gitService: {} as Services['gitService'],
        projectAnalyzer: {} as Services['projectAnalyzer']
      };
      
      const result = await installHooks(args, services);
      console.log(result.message);
      
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });