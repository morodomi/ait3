import { describe, it, expect, beforeEach, vi } from 'vitest';
import { simpleGit } from 'simple-git';
import { SimpleGitService } from './SimpleGitService.js';

// Mock simple-git
vi.mock('simple-git');

// Type for our mock git instance
interface MockGit {
  checkIsRepo: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
  branch: ReturnType<typeof vi.fn>;
  checkoutBranch: ReturnType<typeof vi.fn>;
  checkout: ReturnType<typeof vi.fn>;
  revparse: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  raw: ReturnType<typeof vi.fn>;
}

describe('SimpleGitService', () => {
  let service: SimpleGitService;
  let mockGit: MockGit;

  beforeEach(() => {
    // Create mock git instance
    mockGit = {
      checkIsRepo: vi.fn(),
      status: vi.fn(),
      fetch: vi.fn(),
      branch: vi.fn(),
      checkoutBranch: vi.fn(),
      checkout: vi.fn(),
      revparse: vi.fn(),
      log: vi.fn(),
      raw: vi.fn()
    };

    // Mock the simpleGit constructor
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    service = new SimpleGitService();
  });

  describe('isRepository', () => {
    it('should return true when in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);

      const result = await service.isRepository();

      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false when not in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      const result = await service.isRepository();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockGit.checkIsRepo.mockRejectedValue(new Error('Git error'));

      const result = await service.isRepository();

      expect(result).toBe(false);
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return false when working directory is clean', async () => {
      mockGit.status.mockResolvedValue({ 
        files: [] 
      });

      const result = await service.hasUncommittedChanges();

      expect(result).toBe(false);
      expect(mockGit.status).toHaveBeenCalled();
    });

    it('should return true when there are uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({ 
        files: [
          { path: 'file1.txt', index: 'M', working_dir: ' ' },
          { path: 'file2.txt', index: ' ', working_dir: 'M' }
        ] 
      });

      const result = await service.hasUncommittedChanges();

      expect(result).toBe(true);
    });

    it('should throw error when git status fails', async () => {
      mockGit.status.mockRejectedValue(new Error('Permission denied'));

      await expect(service.hasUncommittedChanges())
        .rejects.toThrow('Permission denied');
    });
  });

  describe('fetch', () => {
    it('should successfully fetch from remote', async () => {
      mockGit.fetch.mockResolvedValue({});

      await service.fetch();

      expect(mockGit.fetch).toHaveBeenCalled();
    });

    it('should throw error when fetch fails', async () => {
      mockGit.fetch.mockRejectedValue(new Error('Network error'));

      await expect(service.fetch())
        .rejects.toThrow('Network error');
    });
  });

  describe('findBranches', () => {
    it('should find branches matching pattern', async () => {
      mockGit.branch.mockResolvedValue({
        all: [
          'feature/0001-test',
          'feature/0001-another',
          'feature/0002-other',
          'main',
          'remotes/origin/feature/0001-remote'
        ],
        current: 'main'
      });

      const result = await service.findBranches('feature/0001-');

      expect(result).toEqual([
        'feature/0001-test',
        'feature/0001-another',
        'origin/feature/0001-remote'
      ]);
    });

    it('should return empty array when no branches match', async () => {
      mockGit.branch.mockResolvedValue({
        all: ['main', 'develop'],
        current: 'main'
      });

      const result = await service.findBranches('feature/9999-');

      expect(result).toEqual([]);
    });

    it('should handle special characters in pattern', async () => {
      mockGit.branch.mockResolvedValue({
        all: ['feature/[special]-branch', 'main'],
        current: 'main'
      });

      const result = await service.findBranches('feature/[special]');

      expect(result).toEqual(['feature/[special]-branch']);
    });
  });

  describe('createBranch', () => {
    it('should create new branch successfully', async () => {
      mockGit.checkoutBranch.mockResolvedValue({});

      await service.createBranch('feature/0003-new');

      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature/0003-new', 'HEAD');
    });

    it('should throw error when branch already exists', async () => {
      mockGit.checkoutBranch.mockRejectedValue(
        new Error('A branch named \'feature/0003-new\' already exists')
      );

      await expect(service.createBranch('feature/0003-new'))
        .rejects.toThrow('already exists');
    });
  });

  describe('checkout', () => {
    it('should checkout existing branch', async () => {
      mockGit.checkout.mockResolvedValue({});

      await service.checkout('feature/0001-existing');

      expect(mockGit.checkout).toHaveBeenCalledWith('feature/0001-existing');
    });

    it('should throw error when branch does not exist', async () => {
      mockGit.checkout.mockRejectedValue(
        new Error('pathspec \'feature/0001-nonexistent\' did not match')
      );

      await expect(service.checkout('feature/0001-nonexistent'))
        .rejects.toThrow('did not match');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockGit.revparse.mockResolvedValue('feature/0001-current');

      const result = await service.getCurrentBranch();

      expect(result).toBe('feature/0001-current');
      expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD']);
    });

    it('should handle detached HEAD state', async () => {
      mockGit.revparse.mockResolvedValue('HEAD');

      const result = await service.getCurrentBranch();

      expect(result).toBe('HEAD');
    });
  });

  describe('getMergeBase', () => {
    it('should return merge base between two branches', async () => {
      mockGit.raw.mockResolvedValue('abc123def456\n');

      const result = await service.getMergeBase('main', 'feature/0001');

      expect(result).toBe('abc123def456');
      expect(mockGit.raw).toHaveBeenCalledWith(['merge-base', 'main', 'feature/0001']);
    });

    it('should throw error when branches have no common ancestor', async () => {
      mockGit.raw.mockRejectedValue(new Error('no merge base'));

      await expect(service.getMergeBase('main', 'unrelated'))
        .rejects.toThrow('no merge base');
    });
  });

  describe('getCommits', () => {
    it('should return list of commits from base to HEAD', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          { hash: '123abc', message: 'feat: add feature' },
          { hash: '456def', message: 'fix: bug fix' },
          { hash: '789ghi', message: 'test: add tests' }
        ]
      });

      const result = await service.getCommits('main');

      expect(result).toEqual([
        { hash: '123abc', message: 'feat: add feature' },
        { hash: '456def', message: 'fix: bug fix' },
        { hash: '789ghi', message: 'test: add tests' }
      ]);
      expect(mockGit.log).toHaveBeenCalledWith({ from: 'main', to: 'HEAD' });
    });

    it('should return empty array when no commits between base and HEAD', async () => {
      mockGit.log.mockResolvedValue({ all: [] });

      const result = await service.getCommits('HEAD');

      expect(result).toEqual([]);
    });
  });

  describe('moveFile', () => {
    it('should move file using git mv', async () => {
      mockGit.raw.mockResolvedValue('');

      await service.moveFile('old/path.md', 'new/path.md');

      expect(mockGit.raw).toHaveBeenCalledWith(['mv', 'old/path.md', 'new/path.md']);
    });

    it('should throw error when git mv fails', async () => {
      mockGit.raw.mockRejectedValue(new Error('File not found'));

      await expect(service.moveFile('nonexistent.md', 'new.md'))
        .rejects.toThrow('File not found');

      expect(mockGit.raw).toHaveBeenCalledWith(['mv', 'nonexistent.md', 'new.md']);
    });

    it('should handle permission errors gracefully', async () => {
      mockGit.raw.mockRejectedValue(new Error('Permission denied'));

      await expect(service.moveFile('readonly.md', 'new.md'))
        .rejects.toThrow('Permission denied');
    });
  });
});