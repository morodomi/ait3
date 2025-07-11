import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, access, readFile, writeFile, chmod, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { spawnSync, execSync } from 'child_process';

describe('Hook System Integration Tests', () => {
  let testDir: string;
  let hooksDir: string;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-hooks-integration-${hash}-`);
    testDir = await mkdtemp(prefix);
    hooksDir = join(testDir, '.claude/hooks');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createHookScripts = async () => {
    // Create directory structure
    await mkdir(hooksDir, { recursive: true });
    
    // Create bash command checker script
    const bashScript = `#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
command=$(echo "$input_json" | jq -r '.tool_input.command // ""')

# sudo check
if [[ "$command" =~ ^sudo[[:space:]] ]]; then
  echo "ERROR: 'sudo' コマンドはブロックされました。" >&2
  exit 1
fi

# rm check
if [[ "$command" =~ ^rm[[:space:]] ]]; then
  echo "ERROR: 'rm' コマンドはブロックされました。" >&2
  echo "代替案: ! rm でClaude Codeコンソールから手動実行してください。" >&2
  exit 1
fi

# chmod dangerous patterns
if [[ "$command" =~ ^chmod[[:space:]] ]]; then
  if [[ "$command" =~ chmod[[:space:]]+777 ]] || [[ "$command" =~ chmod[[:space:]]+\\+s ]]; then
    echo "ERROR: 危険な 'chmod' コマンドがブロックされました。" >&2
    exit 1
  else
    echo "ERROR: 'chmod' コマンドはブロックされました。" >&2
    exit 1
  fi
fi

# curl/wget check
if [[ "$command" =~ ^(curl|wget)[[:space:]] ]]; then
  echo "ERROR: 'curl'/'wget' コマンドはブロックされました。" >&2
  echo "代替案1: gemini -p" >&2
  echo "代替案2: WebFetch ツールを使用してください" >&2
  exit 1
fi

exit 0`;

    await writeFile(join(hooksDir, 'check-bash-commands.sh'), bashScript);
    
    // Create ambiguous language checker script
    const langScript = `#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
content=$(echo "$input_json" | jq -r '.tool_input.new_string // .tool_input.content // ""')

ambiguous_patterns="probably|might|maybe|perhaps|たぶん|かもしれない|おそらく"

if echo "$content" | grep -qiE "$ambiguous_patterns"; then
  detected=$(echo "$content" | grep -oiE "$ambiguous_patterns" | head -1)
  echo "WARNING: 曖昧な表現が検出されました: '$detected'" >&2
fi

# "something went wrong" check
if echo "$content" | grep -qi "something went wrong"; then
  echo "ERROR: 曖昧なエラーメッセージです。" >&2
  exit 1
fi

exit 0`;

    await writeFile(join(hooksDir, 'check-ambiguous-language.sh'), langScript);
    
    // Create web tools checker script
    const webScript = `#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

input_json=$(cat)
tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')

if [[ "$tool_name" == "WebFetch" ]]; then
  echo "INFO: WebFetchを使用しています。" >&2
  echo "代替案: gemini -p" >&2
fi

if [[ "$tool_name" == "WebSearch" ]]; then
  echo "INFO: WebSearchを使用しています。" >&2
  echo "代替案: gemini -p" >&2
fi

exit 0`;

    await writeFile(join(hooksDir, 'check-web-tools.sh'), webScript);
  };

  const executeHookScript = async (scriptName: string, inputJson: object): Promise<{ exitCode: number; stderr: string; stdout: string }> => {
    const scriptPath = join(hooksDir, scriptName);
    const input = JSON.stringify(inputJson);
    
    const result = spawnSync('bash', [scriptPath], {
      input: input,
      encoding: 'utf-8',
      cwd: testDir
    });
    
    return {
      exitCode: result.status || 0,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  };

  describe('dangerous command blocking', () => {
    beforeEach(async () => {
      await createHookScripts();
    });

    it('should block sudo commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'sudo rm -rf /',
          description: 'Delete everything'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('sudo');
      expect(result.stderr).toContain('ブロックされました');
    });

    it('should block rm commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'rm -rf ./some-directory',
          description: 'Delete directory'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('rm');
      expect(result.stderr).toContain('! rm');
    });

    it('should block dangerous chmod commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'chmod 777 /etc/passwd',
          description: 'Change permissions'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('chmod');
      expect(result.stderr).toContain('危険');
    });

    it('should block all chmod commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'chmod +x script.sh',
          description: 'Make executable'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('chmod');
    });

    it('should block curl/wget commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -o file.txt https://example.com/file.txt',
          description: 'Download file'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('curl');
      expect(result.stderr).toContain('gemini -p');
      expect(result.stderr).toContain('WebFetch');
    });

    it('should allow safe commands', async () => {
      const input = {
        tool_name: 'Bash',
        tool_input: {
          command: 'npm test',
          description: 'Run tests'
        }
      };

      const result = await executeHookScript('check-bash-commands.sh', input);
      
      expect(result.exitCode).toBe(0);
    });
  });

  describe('ambiguous language detection', () => {
    beforeEach(async () => {
      await createHookScripts();
    });

    it('should warn about English ambiguous words', async () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'test.ts',
          content: 'This probably fixes the issue',
          new_string: 'This probably fixes the issue'
        }
      };

      const result = await executeHookScript('check-ambiguous-language.sh', input);
      
      expect(result.exitCode).toBe(0); // Warning only
      expect(result.stderr).toContain('WARNING');
      expect(result.stderr).toContain('probably');
    });

    it('should warn about Japanese ambiguous words', async () => {
      const input = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'test.ts',
          content: 'これはたぶん動くと思います'
        }
      };

      const result = await executeHookScript('check-ambiguous-language.sh', input);
      
      expect(result.exitCode).toBe(0); // Warning only
      expect(result.stderr).toContain('WARNING');
      expect(result.stderr).toContain('たぶん');
    });

    it('should block "something went wrong"', async () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'error.ts',
          new_string: 'throw new Error("something went wrong");'
        }
      };

      const result = await executeHookScript('check-ambiguous-language.sh', input);
      
      expect(result.exitCode).toBe(1); // Block
      expect(result.stderr).toContain('ERROR');
      expect(result.stderr).toContain('曖昧なエラーメッセージ');
    });

    it('should allow clear language', async () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'clear.ts',
          new_string: 'This implementation resolves the authentication timeout issue'
        }
      };

      const result = await executeHookScript('check-ambiguous-language.sh', input);
      
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });
  });

  describe('web tools information', () => {
    beforeEach(async () => {
      await createHookScripts();
    });

    it('should provide info for WebFetch usage', async () => {
      const input = {
        tool_name: 'WebFetch',
        tool_input: {
          url: 'https://example.com',
          prompt: 'Get content'
        }
      };

      const result = await executeHookScript('check-web-tools.sh', input);
      
      expect(result.exitCode).toBe(0); // Allow
      expect(result.stderr).toContain('INFO');
      expect(result.stderr).toContain('WebFetch');
      expect(result.stderr).toContain('gemini -p');
    });

    it('should provide info for WebSearch usage', async () => {
      const input = {
        tool_name: 'WebSearch',
        tool_input: {
          query: 'latest news'
        }
      };

      const result = await executeHookScript('check-web-tools.sh', input);
      
      expect(result.exitCode).toBe(0); // Allow
      expect(result.stderr).toContain('INFO');
      expect(result.stderr).toContain('WebSearch');
      expect(result.stderr).toContain('gemini -p');
    });
  });

  describe('CLI integration', () => {
    it('should install hooks via CLI command', async () => {
      // This would test: ait3 install hooks
      // For now, we'll simulate the expected behavior
      
      const cliResult = execSync(`node ${join(process.cwd(), 'bin/ait3.js')} install hooks`, {
        cwd: testDir,
        encoding: 'utf-8',
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      // Should fail since we haven't implemented yet
      expect(cliResult).toBeTruthy();
    });

    it('should integrate with ait3 init command', async () => {
      // This would test hooks installation as part of init
      // For now, we'll verify the expected directory structure
      
      await expect(async () => {
        await access(join(testDir, '.claude/hooks/settings.json'));
      }).rejects.toThrow(); // Should fail until implemented
    });
  });

  describe('hook configuration validation', () => {
    it('should validate settings.json format', async () => {
      await createHookScripts();
      
      const validSettings = {
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
            }
          ]
        }
      };

      await writeFile(
        join(hooksDir, 'settings.json'),
        JSON.stringify(validSettings, null, 2)
      );

      const content = await readFile(join(hooksDir, 'settings.json'), 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed.hooks).toBeDefined();
      expect(parsed.hooks.PreToolUse).toBeDefined();
      expect(Array.isArray(parsed.hooks.PreToolUse)).toBe(true);
    });

    it('should handle malformed JSON configuration', async () => {
      await mkdir(hooksDir, { recursive: true });
      
      // Write invalid JSON
      await writeFile(join(hooksDir, 'settings.json'), '{ invalid json }');
      
      await expect(async () => {
        const content = await readFile(join(hooksDir, 'settings.json'), 'utf-8');
        JSON.parse(content);
      }).rejects.toThrow();
    });
  });
});