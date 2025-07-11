import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, access, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { installHooks, type InstallHooksArgs } from './hooks';
import type { Services } from '../../common/types';

describe('installHooks', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-install-hooks-${hash}-`);
    testDir = await mkdtemp(prefix);

    services = {
      ticketService: {} as Services['ticketService'],
      gitService: {} as Services['gitService'],
      projectAnalyzer: {} as Services['projectAnalyzer']
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('hook system installation', () => {
    it('should create .claude/hooks directory structure', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      const result = await installHooks(args, services);

      expect(result.success).toBe(true);
      
      // Verify directory structure
      await access(join(testDir, '.claude/hooks'));
      await access(join(testDir, '.claude/settings.json'));
      await access(join(testDir, '.claude/hooks/check-bash-commands.sh'));
      await access(join(testDir, '.claude/hooks/check-ambiguous-language.sh'));
      await access(join(testDir, '.claude/hooks/check-web-tools.sh'));
    });

    it('should create valid settings.json configuration', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      await installHooks(args, services);

      const settingsPath = join(testDir, '.claude/settings.json');
      const settingsContent = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);

      expect(settings).toHaveProperty('hooks');
      expect(settings.hooks).toHaveProperty('PreToolUse');
      expect(Array.isArray(settings.hooks.PreToolUse)).toBe(true);
      
      // Check Bash hook
      const bashHook = settings.hooks.PreToolUse.find((h: { matcher: string; hooks: { command: string }[] }) => h.matcher === 'Bash');
      expect(bashHook).toBeDefined();
      expect(bashHook?.hooks[0].command).toBe('.claude/hooks/check-bash-commands.sh');
      
      // Check Edit/Write hook
      const editHook = settings.hooks.PreToolUse.find((h: { matcher: string; hooks: { command: string }[] }) => h.matcher === 'Edit|Write|MultiEdit');
      expect(editHook).toBeDefined();
      expect(editHook?.hooks[0].command).toBe('.claude/hooks/check-ambiguous-language.sh');
      
      // Check WebFetch hook
      const webHook = settings.hooks.PreToolUse.find((h: { matcher: string; hooks: { command: string }[] }) => h.matcher === 'WebFetch|WebSearch');
      expect(webHook).toBeDefined();
      expect(webHook?.hooks[0].command).toBe('.claude/hooks/check-web-tools.sh');
    });

    it('should not overwrite existing hooks without force flag', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      // Install hooks first time
      await installHooks(args, services);
      
      // Try to install again without force
      const result = await installHooks(args, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should overwrite existing hooks with force flag', async () => {
      const argsWithoutForce: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };
      const argsWithForce: InstallHooksArgs = { 
        targetDir: testDir,
        force: true 
      };

      // Install hooks first time
      await installHooks(argsWithoutForce, services);
      
      // Try to install again with force
      const result = await installHooks(argsWithForce, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('overwritten');
    });
  });

  describe('hook script content validation', () => {
    it('should create check-bash-commands.sh with dangerous command patterns', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      await installHooks(args, services);

      const scriptPath = join(testDir, '.claude/hooks/check-bash-commands.sh');
      const scriptContent = await readFile(scriptPath, 'utf-8');

      // Check for dangerous command patterns
      expect(scriptContent).toContain('sudo');
      expect(scriptContent).toContain('rm');
      expect(scriptContent).toContain('chmod');
      expect(scriptContent).toContain('chown');
      expect(scriptContent).toContain('dd');
      expect(scriptContent).toContain('ln');
      expect(scriptContent).toContain('curl');
      expect(scriptContent).toContain('wget');
      
      // Check for project directory protection
      expect(scriptContent).toContain('PROJECT_ROOT');
      expect(scriptContent).toContain('/dev/');
      
      // Check for alternative messages
      expect(scriptContent).toContain('! rm');
      expect(scriptContent).toContain('gemini -p');
      expect(scriptContent).toContain('WebFetch');
    });

    it('should create check-ambiguous-language.sh with language patterns', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      await installHooks(args, services);

      const scriptPath = join(testDir, '.claude/hooks/check-ambiguous-language.sh');
      const scriptContent = await readFile(scriptPath, 'utf-8');

      // Check for English ambiguous words
      expect(scriptContent).toContain('probably');
      expect(scriptContent).toContain('might');
      expect(scriptContent).toContain('maybe');
      expect(scriptContent).toContain('perhaps');
      
      // Check for Japanese ambiguous words
      expect(scriptContent).toContain('たぶん');
      expect(scriptContent).toContain('かもしれない');
      expect(scriptContent).toContain('おそらく');
      
      // Check for specific error message patterns
      expect(scriptContent).toContain('something went wrong');
    });

    it('should create check-web-tools.sh with info messages', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      await installHooks(args, services);

      const scriptPath = join(testDir, '.claude/hooks/check-web-tools.sh');
      const scriptContent = await readFile(scriptPath, 'utf-8');

      // Check for WebFetch handling
      expect(scriptContent).toContain('WebFetch');
      expect(scriptContent).toContain('WebSearch');
      
      // Check for gemini alternative suggestion
      expect(scriptContent).toContain('gemini -p');
      
      // Check that it doesn't block (exit 0)
      expect(scriptContent).toContain('exit 0');
    });
  });

  describe('integration with existing projects', () => {
    it('should work in git repository context', async () => {
      // Initialize git repository
      execSync('git init', { cwd: testDir });
      
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      const result = await installHooks(args, services);
      
      expect(result.success).toBe(true);
      
      // Verify PROJECT_ROOT detection would work
      const scriptPath = join(testDir, '.claude/hooks/check-bash-commands.sh');
      const scriptContent = await readFile(scriptPath, 'utf-8');
      expect(scriptContent).toContain('git rev-parse --show-toplevel');
    });

    it('should work in non-git directory', async () => {
      const args: InstallHooksArgs = { 
        targetDir: testDir,
        force: false 
      };

      const result = await installHooks(args, services);
      
      expect(result.success).toBe(true);
      
      // Verify fallback to pwd
      const scriptPath = join(testDir, '.claude/hooks/check-bash-commands.sh');
      const scriptContent = await readFile(scriptPath, 'utf-8');
      expect(scriptContent).toContain('|| pwd');
    });
  });

  describe('error handling', () => {
    it('should handle invalid target directory', async () => {
      const args: InstallHooksArgs = { 
        targetDir: '/invalid/nonexistent/path',
        force: false 
      };

      const result = await installHooks(args, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });

    it('should handle permission errors gracefully', async () => {
      // Create read-only directory
      const readOnlyDir = join(testDir, 'readonly');
      await mkdir(readOnlyDir, { mode: 0o444 });
      
      const args: InstallHooksArgs = { 
        targetDir: readOnlyDir,
        force: false 
      };

      const result = await installHooks(args, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('permission');
    });
  });
});