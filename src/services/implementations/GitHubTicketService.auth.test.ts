import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubTicketService } from './GitHubTicketService.js';

// Mock child_process
vi.mock('child_process');

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    issues: {
      create: vi.fn(),
      listForRepo: vi.fn(),
      get: vi.fn()
    }
  }))
}));

describe('GitHubTicketService Authentication', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.GITHUB_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('gh auth token fallback', () => {
    it('should use gh auth token when no token provided and useGhCli is true', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue(Buffer.from('test-gh-token\n'));

      new GitHubTicketService({
        owner: 'test',
        repo: 'test',
        useGhCli: true
      });

      expect(execSync).toHaveBeenCalledWith('gh auth token', { encoding: 'utf-8' });
    });

    it('should use gh auth token when no token provided and useGhCli is not set', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue(Buffer.from('test-gh-token\n'));

      new GitHubTicketService({
        owner: 'test',
        repo: 'test'
      });

      expect(execSync).toHaveBeenCalledWith('gh auth token', { encoding: 'utf-8' });
    });

    it('should not use gh auth token when useGhCli is false', async () => {
      const { execSync } = await import('child_process');

      new GitHubTicketService({
        owner: 'test',
        repo: 'test',
        useGhCli: false
      });

      expect(execSync).not.toHaveBeenCalled();
    });

    it('should handle gh auth token failure gracefully', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('gh not installed');
      });

      // Should not throw
      new GitHubTicketService({
        owner: 'test',
        repo: 'test'
      });

      expect(execSync).toHaveBeenCalledWith('gh auth token', { encoding: 'utf-8' });
    });

    it('should prefer config.token over gh auth token', async () => {
      const { execSync } = await import('child_process');

      new GitHubTicketService({
        owner: 'test',
        repo: 'test',
        token: 'config-token'
      });

      expect(execSync).not.toHaveBeenCalled();
    });

    it('should prefer GITHUB_TOKEN env over gh auth token', async () => {
      const { execSync } = await import('child_process');
      process.env.GITHUB_TOKEN = 'env-token';

      new GitHubTicketService({
        owner: 'test',
        repo: 'test'
      });

      expect(execSync).not.toHaveBeenCalled();
    });
  });
});