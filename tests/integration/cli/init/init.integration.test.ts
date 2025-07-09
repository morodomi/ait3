import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, access, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

describe('CLI Integration: ait3 init', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'test-ait3-init-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('default behavior (no subcommand)', () => {
    it('should install ait3-init command guide', async () => {
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      expect(stderr).toBe('');
      expect(stdout).toContain('SUCCESS: Installed command guide: .claude/commands/ait3-init');
      expect(stdout).toContain('Next steps to generate CLAUDE.md:');
      expect(stdout).toContain('1. Launch Claude Code in your terminal: claude');
      expect(stdout).toContain('2. In Claude Code, run: /ait3-init');
      expect(stdout).toContain('3. Follow the interactive guide');

      // Verify file was created
      await expect(access(join(testDir, '.claude/commands/ait3-init'))).resolves.not.toThrow();
    });

    it('should handle when command guide already exists', async () => {
      // First installation
      await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      // Second installation
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      expect(stderr).toBe('');
      expect(stdout).toContain('already exists');
      expect(stdout).toContain('Next steps to generate CLAUDE.md:');
    });

    it('should overwrite with --force flag', async () => {
      // First installation
      await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      // Second installation with force
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init --force');

      expect(stderr).toBe('');
      expect(stdout).toContain('SUCCESS: Installed command guide: .claude/commands/ait3-init');
      expect(stdout).toContain('Next steps to generate CLAUDE.md:');
    });

    it('should create proper ait3-init guide content', async () => {
      await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      const content = await readFile(join(testDir, '.claude/commands/ait3-init'), 'utf-8');
      
      // Verify key content
      expect(content).toContain('AIT³ Initialize - Generate CLAUDE.md');
      expect(content).toContain('ait3 analyze project');
      expect(content).toContain('package.json');
      expect(content).toContain('CLAUDE.md');
    });
  });

  describe('claude-md subcommand', () => {
    it('should maintain backward compatibility', async () => {
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init claude-md');

      expect(stderr).toBe('');
      // Should not install ait3-init guide
      expect(stdout).not.toContain('ait3-init');
      // Should run claude-md command instead
      expect(stdout).toContain('CLAUDE.md');
    });
  });

  describe('unknown subcommand', () => {
    it('should show error for unknown subcommand', async () => {
      const result = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init unknown')
        .catch(err => err);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('Unknown init subcommand: unknown');
      expect(result.stdout).toContain('Available subcommands');
    });
  });

  describe('help output', () => {
    it('should show help with --help flag', async () => {
      const { stdout } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init --help');

      expect(stdout).toContain('Initialize AIT³ components');
      expect(stdout).toContain('init [subcommand]');
    });
  });
});