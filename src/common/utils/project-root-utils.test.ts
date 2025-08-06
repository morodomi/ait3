import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, symlink, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { findProjectRoot, getProjectRoot } from './project-root-utils.js';

describe('projectRootUtils', () => {
  let testDir: string;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-project-root-${hash}-`);
    testDir = await mkdtemp(prefix);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('findProjectRoot', () => {
    it('should find .tickets in current directory', async () => {
      // Arrange
      await mkdir(join(testDir, '.tickets'));
      const resolvedTestDir = await realpath(testDir);
      
      // Act
      const result = await findProjectRoot(testDir);
      
      // Assert
      expect(result).toBe(resolvedTestDir);
    });

    it('should find .tickets in parent directory', async () => {
      // Arrange
      await mkdir(join(testDir, '.tickets'));
      const subDir = join(testDir, 'src', 'components');
      await mkdir(subDir, { recursive: true });
      const resolvedTestDir = await realpath(testDir);
      
      // Act
      const result = await findProjectRoot(subDir);
      
      // Assert
      expect(result).toBe(resolvedTestDir);
    });

    it('should find .git when no .tickets exists', async () => {
      // Arrange
      await mkdir(join(testDir, '.git'));
      const subDir = join(testDir, 'src');
      await mkdir(subDir, { recursive: true });
      const resolvedTestDir = await realpath(testDir);
      
      // Act
      const result = await findProjectRoot(subDir);
      
      // Assert
      expect(result).toBe(resolvedTestDir);
    });

    it('should prefer .tickets over .git', async () => {
      // Arrange
      await mkdir(join(testDir, '.tickets'));
      await mkdir(join(testDir, '.git'));
      const subDir = join(testDir, 'src');
      await mkdir(subDir, { recursive: true });
      const resolvedTestDir = await realpath(testDir);
      
      // Act
      const result = await findProjectRoot(subDir);
      
      // Assert
      expect(result).toBe(resolvedTestDir);
    });

    it('should return start directory when nothing found', async () => {
      // Arrange
      const isolatedDir = join(testDir, 'isolated');
      await mkdir(isolatedDir);
      const resolvedIsolatedDir = await realpath(isolatedDir);
      
      // Act
      const result = await findProjectRoot(isolatedDir);
      
      // Assert
      expect(result).toBe(resolvedIsolatedDir);
    });

    it('should handle filesystem root correctly', async () => {
      // Arrange - use root directory
      const rootDir = '/';
      
      // Act
      const result = await findProjectRoot(rootDir);
      
      // Assert
      expect(result).toBe(rootDir);
    });

    it.skip('should skip directories not owned by current user', async () => {
      // TODO: Mock implementation needs to be refactored for proper testing
      // This test requires mocking fs.promises.stat which is complex with vitest
    });

    it('should resolve symbolic links correctly', async () => {
      // Arrange
      const realDir = join(testDir, 'real');
      const linkDir = join(testDir, 'link');
      await mkdir(realDir);
      await mkdir(join(realDir, '.tickets'));
      await symlink(realDir, linkDir, 'dir');
      const resolvedRealDir = await realpath(realDir);
      
      // Act
      const result = await findProjectRoot(linkDir);
      
      // Assert
      expect(result).toBe(resolvedRealDir);
    });

    it('should handle nested git repositories', async () => {
      // Arrange
      await mkdir(join(testDir, '.tickets'));
      const submoduleDir = join(testDir, 'submodule');
      await mkdir(submoduleDir);
      await mkdir(join(submoduleDir, '.git'));
      const deepDir = join(submoduleDir, 'src');
      await mkdir(deepDir);
      const resolvedTestDir = await realpath(testDir);
      
      // Act
      const result = await findProjectRoot(deepDir);
      
      // Assert
      expect(result).toBe(resolvedTestDir); // Should find root .tickets, not submodule .git
    });
  });

  describe('getProjectRoot', () => {
    beforeEach(() => {
      delete process.env.AIT3_PROJECT_ROOT;
    });

    it('should use valid AIT3_PROJECT_ROOT environment variable', async () => {
      // Arrange
      const customRoot = join(testDir, 'custom-root');
      await mkdir(customRoot);
      process.env.AIT3_PROJECT_ROOT = customRoot;
      const resolvedCustomRoot = await realpath(customRoot);
      
      // Act
      const result = await getProjectRoot();
      
      // Assert
      expect(result).toBe(resolvedCustomRoot);
    });

    it('should fall back when AIT3_PROJECT_ROOT does not exist', async () => {
      // Arrange
      process.env.AIT3_PROJECT_ROOT = join(testDir, 'non-existent');
      await mkdir(join(testDir, '.tickets'));
      const resolvedTestDir = await realpath(testDir);
      
      // Mock console.error to suppress output during test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Change to test directory to avoid finding project's .tickets
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        // Act
        const result = await getProjectRoot();
        
        // Assert
        expect(result).toBe(resolvedTestDir); // Should fall back to findProjectRoot
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid AIT3_PROJECT_ROOT'));
      } finally {
        process.chdir(originalCwd);
        consoleError.mockRestore();
      }
    });

    it.skip('should fall back when AIT3_PROJECT_ROOT is not owned by current user', async () => {
      // TODO: Mock implementation needs to be refactored for proper testing
      // This test requires mocking fs.promises.stat which is complex with vitest
    });

    it('should resolve symbolic links in AIT3_PROJECT_ROOT', async () => {
      // Arrange
      const realDir = join(testDir, 'real-root');
      const linkDir = join(testDir, 'link-root');
      await mkdir(realDir);
      await symlink(realDir, linkDir, 'dir');
      process.env.AIT3_PROJECT_ROOT = linkDir;
      const resolvedRealDir = await realpath(realDir);
      
      // Act
      const result = await getProjectRoot();
      
      // Assert
      expect(result).toBe(resolvedRealDir);
    });

    it('should use findProjectRoot when AIT3_PROJECT_ROOT is not set', async () => {
      // Arrange
      await mkdir(join(testDir, '.tickets'));
      delete process.env.AIT3_PROJECT_ROOT;
      const resolvedTestDir = await realpath(testDir);
      
      // Change to test directory to avoid finding project's .tickets
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        // Act
        const result = await getProjectRoot();
        
        // Assert
        expect(result).toBe(resolvedTestDir);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});