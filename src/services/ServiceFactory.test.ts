import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceFactory } from './ServiceFactory.js';
import { LocalTicketService } from './implementations/LocalTicketService.js';
import { GitHubTicketService } from './implementations/GitHubTicketService.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Mock the service implementations
vi.mock('./implementations/LocalTicketService.js', () => ({
  LocalTicketService: vi.fn()
}));

vi.mock('./implementations/GitHubTicketService.js', () => ({
  GitHubTicketService: vi.fn()
}));

describe('ServiceFactory', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: typeof process.env;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-service-factory-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Save original state
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    
    // Change to test directory
    process.chdir(testDir);
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Restore original state
    process.chdir(originalCwd);
    process.env = originalEnv;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('backend configuration detection', () => {
    it('should default to local backend when no config file exists', async () => {
      const services = ServiceFactory.createServices();
      
      expect(services.ticketService).toBeDefined();
      expect(LocalTicketService).toHaveBeenCalled();
      expect(GitHubTicketService).not.toHaveBeenCalled();
    });

    it('should use local backend when config specifies local', async () => {
      // Create .tickets directory and config
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'local',
          path: '.tickets'
        })
      );

      const services = ServiceFactory.createServices();
      
      expect(services.ticketService).toBeDefined();
      expect(LocalTicketService).toHaveBeenCalled();
      expect(GitHubTicketService).not.toHaveBeenCalled();
    });

    it('should use github backend when config specifies github', async () => {
      // Create .tickets directory and config
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'github',
          github: {
            owner: 'testowner',
            repo: 'testrepo',
            useGhCli: true
          }
        })
      );

      const services = ServiceFactory.createServices();
      
      expect(services.ticketService).toBeDefined();
      expect(GitHubTicketService).toHaveBeenCalled();
      expect(LocalTicketService).not.toHaveBeenCalled();
    });

    it('should handle malformed config file gracefully', async () => {
      // Create .tickets directory and invalid config
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        'invalid json'
      );

      const services = ServiceFactory.createServices();
      
      // Should fallback to local backend
      expect(services.ticketService).toBeDefined();
      expect(LocalTicketService).toHaveBeenCalled();
      expect(GitHubTicketService).not.toHaveBeenCalled();
    });

    it('should handle missing github config gracefully', async () => {
      // Create .tickets directory and config without github section
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'github'
          // Missing github configuration
        })
      );

      expect(() => {
        ServiceFactory.createServices();
      }).toThrow('GitHub backend configuration missing');
    });
  });

  describe('service creation', () => {
    it('should create GitHubTicketService with proper configuration', async () => {
      const githubConfig = {
        owner: 'testowner',
        repo: 'testrepo',
        useGhCli: true,
        labels: {
          todo: 'status:todo',
          doing: 'status:doing',
          done: 'status:done'
        }
      };

      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'github',
          github: githubConfig
        })
      );

      ServiceFactory.createServices();
      
      expect(GitHubTicketService).toHaveBeenCalledWith(githubConfig);
    });

    it('should create LocalTicketService with proper configuration', async () => {
      const localConfig = {
        backend: 'local',
        path: '.tickets'
      };

      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify(localConfig)
      );

      ServiceFactory.createServices();
      
      expect(LocalTicketService).toHaveBeenCalledWith(
        '.tickets',
        undefined // GitService disabled in test environment
      );
    });

    it('should use TICKETS_DIR environment variable when set', async () => {
      const customPath = join(testDir, 'custom-tickets');
      process.env.TICKETS_DIR = customPath;

      await mkdir(customPath, { recursive: true });
      await writeFile(
        join(customPath, 'config.json'),
        JSON.stringify({
          backend: 'local',
          path: customPath
        })
      );

      ServiceFactory.createServices();
      
      expect(LocalTicketService).toHaveBeenCalledWith(
        customPath,
        undefined // GitService disabled in test environment
      );
    });
  });

  describe('test environment handling', () => {
    it('should disable git service in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const services = ServiceFactory.createServices();
      
      expect(services.gitService).toBeUndefined();
    });

    it('should disable git service in vitest environment', async () => {
      process.env.VITEST = 'true';

      const services = ServiceFactory.createServices();
      
      expect(services.gitService).toBeUndefined();
    });
  });
});