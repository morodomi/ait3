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
  let mockExec: ReturnType<typeof vi.fn>;

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
    
    const mockTicketService = {
      listTickets: vi.fn().mockResolvedValue([]),
      createTicket: vi.fn(),
      getTicket: vi.fn(),
      updateTicket: vi.fn(),
      deleteTicket: vi.fn(),
      moveTicket: vi.fn(),
      getNextId: vi.fn(),
      undoLastAction: vi.fn(),
    };
    
    const mockGitService = {
      isRepository: vi.fn(),
      hasUncommittedChanges: vi.fn(),
      getCurrentBranch: vi.fn(),
      fetch: vi.fn(),
      findBranches: vi.fn(),
      createBranch: vi.fn(),
      checkout: vi.fn(),
      getMergeBase: vi.fn(),
      getCommits: vi.fn(),
      moveFile: vi.fn(),
    };
    
    const mockProjectAnalyzer = {
      analyzeProject: vi.fn(),
    };
    
    services = {
      ticketService: mockTicketService,
      gitService: mockGitService,
      projectAnalyzer: mockProjectAnalyzer,
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

    it('should store remote name in configuration', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ stdout: 'origin\tgit@github.com:owner/repo.git' });

      await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );

      expect(config.github.remote).toBe('origin');
    });

    it('should handle multiple remotes by prompting user', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ 
          stdout: 'origin\tgit@github.com:owner1/repo1.git (fetch)\nupstream\tgit@github.com:owner2/repo2.git (fetch)' 
        });

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Multiple remotes found');
      expect(result.data?.details).toContain('origin: owner1/repo1');
      expect(result.data?.details).toContain('upstream: owner2/repo2');
      expect(result.data?.details).toContain('ait3 setup ticket github owner/repo');
    });

    it('should detect and notify about existing local tickets', async () => {
      services.ticketService.listTickets = vi.fn().mockResolvedValue([
        { id: '001', title: 'Test ticket 1' },
        { id: '002', title: 'Test ticket 2' },
        { id: '003', title: 'Test ticket 3' }
      ]);

      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ stdout: 'origin\tgit@github.com:owner/repo.git' });

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(true);
      expect(result.message).toContain('GitHub ticket backend configured successfully');
      expect(result.data?.details).toContain('Found 3 local tickets');
      expect(result.data?.details).toContain('Use \'ait3 migrate\' to transfer them');
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
        .mockResolvedValueOnce({ stdout: 'origin\tgit@github.com:new/repo.git (fetch)' });

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
      expect(result.message).toContain('Already configured');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should show current configuration when already configured', async () => {
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({ 
          backend: 'github',
          github: { owner: 'morodomi', repo: 'ait3' }
        })
      );

      const result = await setupTicketGitHub({}, services, { cwd: testDir }, mockExec);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already configured for GitHub (morodomi/ait3)');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should accept owner/repo argument', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockResolvedValueOnce({ 
          stdout: JSON.stringify({ owner: { login: 'testowner' }, name: 'testrepo' })
        });

      const result = await setupTicketGitHub(
        { repository: 'testowner/testrepo' },
        services,
        { cwd: testDir },
        mockExec
      );

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('gh api repos/testowner/testrepo', expect.anything());
      
      const config = JSON.parse(
        await readFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );
      expect(config.github.owner).toBe('testowner');
      expect(config.github.repo).toBe('testrepo');
    });

    it('should validate repository access when owner/repo provided', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'gh version 2.40.0' })
        .mockResolvedValueOnce({ stdout: 'Logged in to github.com' })
        .mockRejectedValueOnce(new Error('Could not resolve to a Repository'));

      const result = await setupTicketGitHub(
        { repository: 'invalid/repo' },
        services,
        { cwd: testDir },
        mockExec
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot access repository: invalid/repo');
      expect(result.data?.details).toContain('Check repository name and access permissions');
    });
  });
});

// Helper function for tests
async function readFile(path: string, encoding: 'utf8' | 'utf-8'): Promise<string> {
  const { readFile: fsReadFile } = await import('fs/promises');
  return fsReadFile(path, encoding);
}