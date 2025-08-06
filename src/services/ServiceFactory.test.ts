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
      const services = await ServiceFactory.createServices();
      
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

      const services = await ServiceFactory.createServices();
      
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

      const services = await ServiceFactory.createServices();
      
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

      const services = await ServiceFactory.createServices();
      
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

      await expect(ServiceFactory.createServices()).rejects.toThrow('GitHub backend configuration missing');
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

      await ServiceFactory.createServices();
      
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

      // Change to test directory to ensure proper root detection
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        await ServiceFactory.createServices();
        
        expect(LocalTicketService).toHaveBeenCalledWith(
          expect.stringMatching(/\.tickets$/),
          undefined // GitService disabled in test environment
        );
      } finally {
        process.chdir(originalCwd);
      }
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

      await ServiceFactory.createServices();
      
      expect(LocalTicketService).toHaveBeenCalledWith(
        customPath,
        undefined // GitService disabled in test environment
      );
    });
  });

  describe('test environment handling', () => {
    it('should disable git service in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const services = await ServiceFactory.createServices();
      
      expect(services.gitService).toBeUndefined();
    });

    it('should disable git service in vitest environment', async () => {
      process.env.VITEST = 'true';

      const services = await ServiceFactory.createServices();
      
      expect(services.gitService).toBeUndefined();
    });
  });

  describe('async behavior (ticket #120)', () => {
    it('should return a Promise when createServices is called', async () => {
      const result = ServiceFactory.createServices();
      
      // After async conversion, this should be a Promise
      expect(result).toBeInstanceOf(Promise);
      
      const services = await result;
      expect(services).toBeDefined();
      expect(services.ticketService).toBeDefined();
    });

    it('should handle file reading asynchronously without blocking', async () => {
      // Create config file
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'local',
          path: '.tickets'
        })
      );

      const startTime = Date.now();
      
      // This should not block the main thread
      const servicesPromise = ServiceFactory.createServices();
      
      // Should return immediately (non-blocking)
      const immediateTime = Date.now();
      expect(immediateTime - startTime).toBeLessThan(10); // Should be nearly instant
      
      // Actual services should be available after await
      const services = await servicesPromise;
      expect(services.ticketService).toBeDefined();
    });

    it('should handle concurrent createServices calls properly', async () => {
      // Create config file
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'local',
          path: '.tickets'
        })
      );

      // Multiple concurrent calls should not interfere
      const promises = [
        ServiceFactory.createServices(),
        ServiceFactory.createServices(),
        ServiceFactory.createServices()
      ];

      const results = await Promise.all(promises);
      
      results.forEach(services => {
        expect(services.ticketService).toBeDefined();
        expect(LocalTicketService).toHaveBeenCalled();
      });
    });

    it('should handle async file reading errors gracefully', async () => {
      // Create .tickets directory but with unreadable config file
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        'invalid json content'
      );

      // Should still resolve successfully with fallback config
      const services = await ServiceFactory.createServices();
      
      expect(services.ticketService).toBeDefined();
      expect(LocalTicketService).toHaveBeenCalled();
    });

    it('should maintain error handling behavior with async operations', async () => {
      // Test missing GitHub config with async behavior
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'github'
          // Missing github configuration
        })
      );

      // Should reject the promise with proper error
      await expect(ServiceFactory.createServices()).rejects.toThrow('GitHub backend configuration missing');
    });
  });

  describe('project root detection', () => {
    it('should detect project root from subdirectory', async () => {
      // Create .tickets in root
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'local',
          local: { path: '.tickets' }
        })
      );

      // Create subdirectory and change to it
      const subDir = join(testDir, 'src', 'components');
      await mkdir(subDir, { recursive: true });
      process.chdir(subDir);

      // Should find root .tickets, not create new one in subdirectory
      const services = await ServiceFactory.createServices();
      
      expect(services.ticketService).toBeDefined();
      expect(LocalTicketService).toHaveBeenCalledWith(
        expect.stringMatching(/\.tickets$/), // Should use absolute path ending with .tickets
        undefined // GitService disabled in test environment
      );
    });

    it('should call findProjectRoot only once per createServices call', async () => {
      // Create config
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({ backend: 'local' })
      );

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        // Spy on getProjectRoot from the actual module
        const projectRootUtils = await import('../common/utils/project-root-utils.js');
        const spy = vi.spyOn(projectRootUtils, 'getProjectRoot');
        
        const services = await ServiceFactory.createServices();
        
        // Should only call getProjectRoot once
        expect(spy).toHaveBeenCalledTimes(1);
        expect(services.ticketService).toBeDefined();
        expect(services.projectAnalyzer).toBeDefined();
        
        spy.mockRestore();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle absolute TICKETS_DIR correctly', async () => {
      const absolutePath = join(testDir, 'custom-tickets');
      await mkdir(absolutePath, { recursive: true });
      await writeFile(
        join(absolutePath, 'config.json'),
        JSON.stringify({ backend: 'local' })
      );

      process.env.TICKETS_DIR = absolutePath;

      const _services = await ServiceFactory.createServices();
      
      expect(LocalTicketService).toHaveBeenCalledWith(
        absolutePath,
        undefined // GitService disabled in test environment
      );
    });

    it('should handle relative TICKETS_DIR with project root', async () => {
      // Create .tickets in project root
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      
      process.env.TICKETS_DIR = '.tickets';

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const _services = await ServiceFactory.createServices();
        
        expect(LocalTicketService).toHaveBeenCalledWith(
          expect.stringMatching(/\.tickets$/),
          undefined // GitService disabled in test environment
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should use detected root for ProjectAnalyzer', async () => {
      // Create subdirectory and change to it
      const subDir = join(testDir, 'src');
      await mkdir(subDir, { recursive: true });
      await mkdir(join(testDir, '.tickets'), { recursive: true });
      
      process.chdir(subDir);

      const services = await ServiceFactory.createServices();
      
      // ProjectAnalyzer should use project root, not current directory
      expect(services.projectAnalyzer).toBeDefined();
      // Verify the analyzer was created (we can't easily test the path it received)
      expect(services.projectAnalyzer).toBeTruthy();
    });
  });
});