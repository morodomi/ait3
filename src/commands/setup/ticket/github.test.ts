import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTicketGitHub } from './github.js';
import type { Services } from '../../../common/types.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('setupTicketGitHub', () => {
  let testDir: string;
  let services: Services;
  let mockExec: any;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-setup-ticket-github-${hash}-`);
    testDir = await mkdtemp(prefix);

    // Create .tickets directory
    await mkdir(join(testDir, '.tickets'), { recursive: true });
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'local',
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 1 },
      }, null, 2)
    );

    mockExec = vi.fn();
    
    services = {
      ticketService: {} as any,
      gitService: {} as any,
      projectAnalyzer: {} as any,
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('gh command validation', () => {
    it('should fail if gh command is not available', async () => {
      mockExec.mockRejectedValue(new Error('command not found'));

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(false);
      expect(result.message).toContain('GitHub CLI (gh) is not installed');
      expect(result.data?.details).toContain('https://cli.github.com');
      expect(mockExec).toHaveBeenCalledWith('gh --version', { cwd: testDir });
    });

    it('should check gh auth status after finding gh', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockRejectedValueOnce(new Error('not logged in'));

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not authenticated with GitHub');
      expect(result.data?.details).toContain('gh auth login');
      expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it('should succeed if gh is authenticated', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' });

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(true);
      expect(result.message).toContain('GitHub ticket backend configured successfully');
    });
  });

  describe('configuration update', () => {
    it('should update config.json with github backend', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' });

      await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      const configPath = join(testDir, '.tickets', 'config.json');
      const config = JSON.parse(await readFile(configPath, 'utf-8'));

      expect(config.backend).toBe('github');
      expect(config.github).toBeDefined();
      expect(config.github.useGhCli).toBe(true);
    });

    it('should detect repository owner and name from git remote', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ 
          stdout: 'origin\tgit@github.com:testowner/testrepo.git (fetch)' 
        });

      await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );

      expect(config.github.owner).toBe('testowner');
      expect(config.github.repo).toBe('testrepo');
    });

    it('should handle HTTPS git remote URLs', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ 
          stdout: 'origin\thttps://github.com/testowner/testrepo.git (fetch)' 
        });

      await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );

      expect(config.github.owner).toBe('testowner');
      expect(config.github.repo).toBe('testrepo');
    });

    it('should set default labels configuration', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ stdout: 'origin\tgit@github.com:owner/repo.git' });

      await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );

      expect(config.github.labels).toEqual({
        todo: 'status:todo',
        doing: 'status:doing',
        done: 'status:done',
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing .tickets directory', async () => {
      const emptyDir = await mkdtemp(join(tmpdir(), 'test-empty-'));
      
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' });

      const result = await setupTicketGitHub({}, services, { cwd: emptyDir }, mockExec);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No .tickets directory found');
      expect(result.data?.details).toContain('ait3 ticket create');

      await rm(emptyDir, { recursive: true, force: true });
    });

    it('should handle git remote detection failure gracefully', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockRejectedValueOnce(new Error('not a git repository'));

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(true);
      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );
      expect(config.github.owner).toBe('');
      expect(config.github.repo).toBe('');
    });
  });

  describe('options', () => {
    it('should force setup even if already configured', async () => {
      // Pre-configure as github
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'github',
          github: { owner: 'old', repo: 'old' },
        })
      );

      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ stdout: 'origin\tgit@github.com:new/repo.git' });

      const result = await setupTicketGitHub(
        { force: true }, 
        services, 
        { cwd: testDir },
        mockExec
      );

      expect(result.success).toBe(true);
      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );
      expect(config.github.owner).toBe('new');
      expect(config.github.repo).toBe('repo');
    });

    it('should skip if already configured without force flag', async () => {
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({ backend: 'github' })
      );

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already configured');
      expect(mockExec).not.toHaveBeenCalled();
    });
  });
});

// Helper function for tests
async function readFile(path: string, encoding: BufferEncoding): Promise<string> {
  const { readFile: fsReadFile } = await import('fs/promises');
  return fsReadFile(path, encoding);
}