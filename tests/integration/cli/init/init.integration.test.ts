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

  describe('default behavior', () => {
    it('should generate 3 files for Claude Code integration', async () => {
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');

      expect(stderr).toBe('');
      expect(stdout).toContain('SUCCESS:');
      expect(stdout).toContain('3 files generated');
      expect(stdout).toContain('CLAUDE.ait3.md');
      expect(stdout).toContain('.claude/CLAUDE.md');
      expect(stdout).toContain('.claude/commands/ait3-init');
      expect(stdout).not.toContain('.claude/commands/review');
      expect(stdout).toContain('Next steps:');
      expect(stdout).toContain('Launch Claude Code: claude');
      expect(stdout).toContain('Run: /ait3-init');

      // Verify all 3 files were created
      await expect(access(join(testDir, 'CLAUDE.ait3.md'))).resolves.not.toThrow();
      await expect(access(join(testDir, '.claude/CLAUDE.md'))).resolves.not.toThrow();
      await expect(access(join(testDir, '.claude/commands/ait3-init'))).resolves.not.toThrow();
      
      // Review command should NOT be created
      await expect(access(join(testDir, '.claude/commands/review'))).rejects.toThrow();
    });

    it('should overwrite existing files without warning', async () => {
      // First generation
      await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');
      
      // Verify files exist
      const firstContent = await readFile(join(testDir, 'CLAUDE.ait3.md'), 'utf-8');
      
      // Second generation - should overwrite
      const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');
      
      expect(stderr).toBe('');
      expect(stdout).toContain('SUCCESS:');
      expect(stdout).toContain('3 files generated');
      
      // Verify files still exist and are overwritten
      const secondContent = await readFile(join(testDir, 'CLAUDE.ait3.md'), 'utf-8');
      expect(secondContent).toBe(firstContent); // Same content since same project
    });

    it('should create proper ait3-init guide content', async () => {
      await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');
      
      const content = await readFile(join(testDir, '.claude/commands/ait3-init'), 'utf-8');
      
      expect(content).toContain('Initialize Complete CLAUDE.md');
      expect(content).toContain('ait3 install security');
      expect(content).toContain('Read CLAUDE.ait3.md');
      expect(content).toContain('Delete CLAUDE.ait3.md');
    });

    it('should detect project type and include in CLAUDE.ait3.md', async () => {
      // Create a package.json to simulate Node.js project
      await execAsync('echo \'{"name":"test-project","version":"1.0.0"}\' > package.json');
      
      const { stdout } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init');
      
      expect(stdout).toContain('Detected:');
      expect(stdout).toContain('Node.js project');
      
      // Check CLAUDE.ait3.md content
      const content = await readFile(join(testDir, 'CLAUDE.ait3.md'), 'utf-8');
      expect(content).toContain('test-project');
      expect(content).toContain('Node.js');
    });
  });

  describe('subcommand behavior', () => {
    it('should reject subcommands with helpful error', async () => {
      try {
        await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init claude-md');
        expect.fail('Command should have failed');
      } catch (err: any) {
        const output = err.stdout || err.stderr;
        expect(output).toContain('Subcommands are no longer supported');
        expect(output).toContain('ait3 init');
        expect(output).toContain('claude');
        expect(output).toContain('/ait3-init');
      }
    });

    it('should reject unknown subcommands', async () => {
      try {
        await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init unknown');
        expect.fail('Command should have failed');
      } catch (err: any) {
        const output = err.stdout || err.stderr;
        expect(output).toContain('Subcommands are no longer supported');
      }
    });
  });

  describe('help output', () => {
    it('should show help with --help flag', async () => {
      const { stdout } = await execAsync('node ' + join(originalCwd, 'dist/cli.js') + ' init --help');
      
      expect(stdout).toContain('Usage: ait3 init [options]');
      expect(stdout).toContain('Initialize AIT³ for Claude Code integration');
    });
  });
});