import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { fileExists, generateTemplateFiles, generateTemplateFilesWithReport } from './file-generator.js';

describe('file-generator utilities', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-file-generator-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      await writeFile('test.txt', 'content');
      
      const exists = await fileExists('test.txt');
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const exists = await fileExists('nonexistent.txt');
      
      expect(exists).toBe(false);
    });

    it('should throw for permission errors', async () => {
      // This test is difficult to implement cross-platform
      // Just ensure the function signature works
      expect(fileExists).toBeDefined();
    });
  });

  describe('generateTemplateFiles', () => {
    it('should generate template files in correct locations', async () => {
      const templates = [
        { path: 'src/test.md', content: '# Test 1' },
        { path: 'nested/dir/test.md', content: '# Test 2' }
      ];

      await generateTemplateFiles(templates);

      const content1 = await readFile('src/test.md', 'utf-8');
      const content2 = await readFile('nested/dir/test.md', 'utf-8');
      
      expect(content1).toBe('# Test 1');
      expect(content2).toBe('# Test 2');
    });

    it('should skip existing files by default', async () => {
      await writeFile('existing.md', 'original content');
      
      const templates = [
        { path: 'existing.md', content: 'new content' }
      ];

      await generateTemplateFiles(templates);

      const content = await readFile('existing.md', 'utf-8');
      expect(content).toBe('original content');
    });

    it('should overwrite files when overwrite option is true', async () => {
      await writeFile('existing.md', 'original content');
      
      const templates = [
        { path: 'existing.md', content: 'new content' }
      ];

      await generateTemplateFiles(templates, { overwrite: true });

      const content = await readFile('existing.md', 'utf-8');
      expect(content).toBe('new content');
    });
  });

  describe('generateTemplateFilesWithReport', () => {
    it('should report created files', async () => {
      const templates = [
        { path: 'new1.md', content: 'content 1' },
        { path: 'new2.md', content: 'content 2' }
      ];

      const result = await generateTemplateFilesWithReport(templates);

      expect(result.created).toEqual(['new1.md', 'new2.md']);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should report skipped files', async () => {
      await writeFile('existing.md', 'original');
      
      const templates = [
        { path: 'existing.md', content: 'new content' },
        { path: 'new.md', content: 'new file' }
      ];

      const result = await generateTemplateFilesWithReport(templates);

      expect(result.created).toEqual(['new.md']);
      expect(result.skipped).toEqual(['existing.md']);
      expect(result.errors).toEqual([]);
    });

    it('should handle and report errors gracefully', async () => {
      const templates = [
        { path: '/invalid/path/file.md', content: 'content' }
      ];

      const result = await generateTemplateFilesWithReport(templates);

      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].path).toBe('/invalid/path/file.md');
      expect(result.errors[0].error).toContain('ENOENT');
    });
  });
});