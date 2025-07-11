import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installCommand } from './command.js';
import { mkdtemp, rm, access, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('installCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-install-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('install specific command', () => {
    it('should install ait3 command guide when specified', async () => {
      const args = { name: 'ait3' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Installed');
      expect(result.message).toContain('.claude/commands/ait3');
      
      // Check file was created
      const filePath = join(testDir, '.claude/commands/ait3');
      await expect(access(filePath)).resolves.toBeUndefined();
      
      // Check content
      const content = await readFile(filePath, 'utf-8');
      expect(content).toContain('AIT³ - AI-Driven Development Platform');
      expect(content).toContain('ait3 ticket create');
      expect(content).toContain('ait3 flow plan');
    });

    it('should create directories if they do not exist', async () => {
      const args = { name: 'ait3' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created directory');
      expect(result.message).toContain('.claude/commands');
    });

    it('should warn about existing file', async () => {
      // Create existing file
      await mkdir(join(testDir, '.claude/commands'), { recursive: true });
      await writeFile(join(testDir, '.claude/commands/ait3'), 'existing content');
      
      const args = { name: 'ait3', force: false };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
      expect(result.message).toContain('--force');
    });

    it('should overwrite with force flag', async () => {
      // Create existing file
      await mkdir(join(testDir, '.claude/commands'), { recursive: true });
      await writeFile(join(testDir, '.claude/commands/ait3'), 'old content');
      
      const args = { name: 'ait3', force: true };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Overwriting existing file');
      
      // Check new content
      const content = await readFile(join(testDir, '.claude/commands/ait3'), 'utf-8');
      expect(content).toContain('AIT³ - AI-Driven Development Platform');
    });

    it('should handle invalid command name', async () => {
      const args = { name: 'invalid' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
      expect(result.message).toContain('Available commands');
      expect(result.message).toContain('ait3');
      expect(result.message).toContain('gemini');
      expect(result.message).toContain('orchestrator');
      expect(result.message).toContain('ait3-init');
      expect(result.message).toContain('code-review');
    });

    it('should install gemini command guide', async () => {
      const args = { name: 'gemini' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('.claude/commands/gemini');
      
      const content = await readFile(join(testDir, '.claude/commands/gemini'), 'utf-8');
      expect(content).toContain('Using Gemini CLI');
      expect(content).toContain('TiDD workflow');
    });

    it('should install orchestrator command guide', async () => {
      const args = { name: 'orchestrator' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('.claude/commands/orchestrator');
      
      const content = await readFile(join(testDir, '.claude/commands/orchestrator'), 'utf-8');
      expect(content).toContain('Split complex tasks');
      expect(content).toContain('parallel subtasks');
    });

    it('should install ait3-init command guide', async () => {
      const args = { name: 'ait3-init' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('.claude/commands/ait3-init');
      
      const content = await readFile(join(testDir, '.claude/commands/ait3-init'), 'utf-8');
      expect(content).toContain('Generate CLAUDE.md');
      expect(content).toContain('Project Analysis');
    });

    it('should install code-review command guide', async () => {
      const args = { name: 'code-review' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('.claude/commands/code-review');
      
      const content = await readFile(join(testDir, '.claude/commands/code-review'), 'utf-8');
      expect(content).toContain('Multi-Agent Code Review');
      expect(content).toContain('Correctness Review (Claude)');
      expect(content).toContain('Performance Review (Gemini)');
      expect(content).toContain('Security Review (Claude)');
    });

    it('should reject old review command name', async () => {
      const args = { name: 'review' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
      expect(result.message).toContain('review');
      expect(result.message).toContain('Available commands');
      expect(result.message).toContain('code-review');
    });
  });

  describe('install all commands', () => {
    it('should install all commands when no name specified', async () => {
      const args = {};
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Installing all command guides');
      expect(result.message).toContain('.claude/commands/ait3');
      expect(result.message).toContain('.claude/commands/gemini');
      expect(result.message).toContain('.claude/commands/orchestrator');
      expect(result.message).toContain('.claude/commands/ait3-init');
      expect(result.message).toContain('.claude/commands/code-review');
      
      // Check all files
      const ait3Path = join(testDir, '.claude/commands/ait3');
      const geminiPath = join(testDir, '.claude/commands/gemini');
      const orchestratorPath = join(testDir, '.claude/commands/orchestrator');
      const ait3InitPath = join(testDir, '.claude/commands/ait3-init');
      const codeReviewPath = join(testDir, '.claude/commands/code-review');
      
      await expect(access(ait3Path)).resolves.toBeUndefined();
      await expect(access(geminiPath)).resolves.toBeUndefined();
      await expect(access(orchestratorPath)).resolves.toBeUndefined();
      await expect(access(ait3InitPath)).resolves.toBeUndefined();
      await expect(access(codeReviewPath)).resolves.toBeUndefined();
    });

    it('should install all commands with "all" name', async () => {
      const args = { name: 'all' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Installing all command guides');
    });

    it('should skip existing files without force', async () => {
      // Create existing file
      await mkdir(join(testDir, '.claude/commands'), { recursive: true });
      await writeFile(join(testDir, '.claude/commands/ait3'), 'existing');
      
      const args = {};
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Skipped');
      expect(result.message).toContain('already exists');
    });

    it('should report summary after installation', async () => {
      const args = {};
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Installation complete');
      expect(result.message).toContain('5 file(s) installed');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Make directory read-only
      await mkdir(join(testDir, '.claude'), { mode: 0o444 });
      
      const args = { name: 'ait3' };
      
      const result = await installCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });
  });
});

import { mkdir, writeFile } from 'fs/promises';