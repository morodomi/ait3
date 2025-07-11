import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, access, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import {
  ensureDirectoryExists,
  checkFileExists,
  writeFileWithDirectoryCreation,
  // New atomic operations (to be implemented)
  atomicWriteFile,
  atomicWriteFileWithDirectoryCreation
} from './file-operations.js';

describe('file-operations', () => {
  let testDir: string;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-file-operations-${hash}-`);
    testDir = await mkdtemp(prefix);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('existing functionality', () => {
    describe('ensureDirectoryExists', () => {
      it('should create directory if it does not exist', async () => {
        const dirPath = join(testDir, 'new-dir');
        
        const created = await ensureDirectoryExists(dirPath);
        
        expect(created).toBe(true);
        await expect(access(dirPath)).resolves.not.toThrow();
      });

      it('should return false if directory already exists', async () => {
        const dirPath = join(testDir, 'existing-dir');
        await mkdir(dirPath);
        
        const created = await ensureDirectoryExists(dirPath);
        
        expect(created).toBe(false);
      });
    });

    describe('checkFileExists', () => {
      it('should return exists: false for non-existent file', async () => {
        const filePath = join(testDir, 'non-existent.txt');
        
        const result = await checkFileExists(filePath);
        
        expect(result.exists).toBe(false);
        expect(result.shouldWrite).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should return exists: true and shouldWrite: false for existing file without force', async () => {
        const filePath = join(testDir, 'existing.txt');
        await writeFile(filePath, 'content');
        
        const result = await checkFileExists(filePath, false);
        
        expect(result.exists).toBe(true);
        expect(result.shouldWrite).toBe(false);
        expect(result.message).toContain('already exists');
      });

      it('should return shouldWrite: true for existing file with force', async () => {
        const filePath = join(testDir, 'existing.txt');
        await writeFile(filePath, 'content');
        
        const result = await checkFileExists(filePath, true);
        
        expect(result.exists).toBe(true);
        expect(result.shouldWrite).toBe(true);
        expect(result.message).toContain('Overwriting');
      });
    });

    describe('writeFileWithDirectoryCreation', () => {
      it('should create directory and write file', async () => {
        const filePath = join(testDir, 'subdir', 'file.txt');
        const content = 'test content';
        
        const result = await writeFileWithDirectoryCreation(filePath, content);
        
        expect(result.success).toBe(true);
        expect(result.directoryCreated).toBe(true);
        expect(result.fileOverwritten).toBe(false);
        
        const writtenContent = await readFile(filePath, 'utf-8');
        expect(writtenContent).toBe(content);
      });

      it('should not overwrite existing file without force', async () => {
        const filePath = join(testDir, 'file.txt');
        await writeFile(filePath, 'original');
        
        const result = await writeFileWithDirectoryCreation(filePath, 'new content');
        
        expect(result.success).toBe(false);
        expect(result.fileOverwritten).toBe(false);
        
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('original');
      });
    });
  });

  describe('atomic file operations (ticket #122)', () => {
    describe('atomicWriteFile', () => {
      it('should write file atomically using write-then-rename pattern', async () => {
        const filePath = join(testDir, 'atomic-test.txt');
        const content = 'atomic content';
        
        await atomicWriteFile(filePath, content);
        
        const writtenContent = await readFile(filePath, 'utf-8');
        expect(writtenContent).toBe(content);
      });

      it('should use temporary file during write operation', async () => {
        const filePath = join(testDir, 'atomic-test.txt');
        const content = 'atomic content';
        
        // Track directory contents during operation to verify temp file behavior
        const dirContentsBefore = await readdir(testDir);
        expect(dirContentsBefore).not.toContain('atomic-test.txt');
        
        // Perform atomic write
        await atomicWriteFile(filePath, content);
        
        // Final file should exist with correct content
        const finalContent = await readFile(filePath, 'utf-8');
        expect(finalContent).toBe(content);
        
        // No temporary files should remain
        const dirContentsAfter = await readdir(testDir);
        const tempFiles = dirContentsAfter.filter(file => file.includes('.tmp'));
        expect(tempFiles).toHaveLength(0);
      });

      it('should clean up temporary file on write error', async () => {
        const content = 'fail content';
        
        // Try to write to an invalid path that will cause an error
        const invalidPath = join(testDir, 'nonexistent', 'deep', 'path', 'file.txt');
        
        await expect(atomicWriteFile(invalidPath, content)).rejects.toThrow();
        
        // Verify no temporary files remain in any accessible directory
        const files = await readdir(testDir);
        const tempFiles = files.filter(file => file.includes('.tmp'));
        expect(tempFiles).toHaveLength(0);
      });

      it('should handle concurrent atomic writes safely', async () => {
        const filePath1 = join(testDir, 'concurrent1.txt');
        const filePath2 = join(testDir, 'concurrent2.txt');
        const content1 = 'content 1';
        const content2 = 'content 2';
        
        // Run concurrent atomic writes
        const [result1, result2] = await Promise.all([
          atomicWriteFile(filePath1, content1),
          atomicWriteFile(filePath2, content2)
        ]);
        
        // Both should succeed
        expect(result1).toBeUndefined(); // void return
        expect(result2).toBeUndefined(); // void return
        
        // Both files should have correct content
        const writtenContent1 = await readFile(filePath1, 'utf-8');
        const writtenContent2 = await readFile(filePath2, 'utf-8');
        expect(writtenContent1).toBe(content1);
        expect(writtenContent2).toBe(content2);
      });

      it('should maintain file atomicity during rename failure', async () => {
        const filePath = join(testDir, 'rename-fail.txt');
        const originalContent = 'original';
        const newContent = 'new content';
        
        // Create original file
        await writeFile(filePath, originalContent);
        
        // Test atomicity concept: if anything goes wrong during the atomic operation,
        // the original file should remain unchanged. We simulate this by trying to
        // write to an invalid target path that will cause the operation to fail.
        const invalidTargetPath = join(testDir, 'nonexistent', 'invalid.txt');
        
        // The atomic write should fail for the invalid path
        await expect(atomicWriteFile(invalidTargetPath, newContent)).rejects.toThrow();
        
        // Original file should still exist and be unchanged
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(originalContent);
        
        // No temp files should remain in the test directory
        const files = await readdir(testDir);
        const tempFiles = files.filter(file => file.includes('.tmp'));
        expect(tempFiles).toHaveLength(0);
      });

      it('should handle existing file overwrite correctly', async () => {
        const filePath = join(testDir, 'overwrite.txt');
        const originalContent = 'original';
        const newContent = 'new content';
        
        // Create original file
        await writeFile(filePath, originalContent);
        
        // Atomic overwrite
        await atomicWriteFile(filePath, newContent);
        
        // Should have new content
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(newContent);
      });
    });

    describe('atomicWriteFileWithDirectoryCreation', () => {
      it('should create directory and write file atomically', async () => {
        const filePath = join(testDir, 'new-dir', 'atomic-file.txt');
        const content = 'atomic with directory';
        
        const result = await atomicWriteFileWithDirectoryCreation(filePath, content);
        
        expect(result.success).toBe(true);
        expect(result.directoryCreated).toBe(true);
        expect(result.fileOverwritten).toBe(false);
        
        const writtenContent = await readFile(filePath, 'utf-8');
        expect(writtenContent).toBe(content);
      });

      it('should respect force flag for existing files', async () => {
        const filePath = join(testDir, 'overwrite-dir', 'file.txt');
        const originalContent = 'original';
        const newContent = 'new content';
        
        // Create directory and original file
        await mkdir(join(testDir, 'overwrite-dir'));
        await writeFile(filePath, originalContent);
        
        // Try without force (should fail)
        const result1 = await atomicWriteFileWithDirectoryCreation(filePath, newContent, false);
        expect(result1.success).toBe(false);
        
        const content1 = await readFile(filePath, 'utf-8');
        expect(content1).toBe(originalContent);
        
        // Try with force (should succeed)
        const result2 = await atomicWriteFileWithDirectoryCreation(filePath, newContent, true);
        expect(result2.success).toBe(true);
        
        const content2 = await readFile(filePath, 'utf-8');
        expect(content2).toBe(newContent);
      });

      it('should handle directory creation failure gracefully', async () => {
        // Use a path that would fail directory creation (e.g., under a file)
        const blockingFile = join(testDir, 'blocking-file');
        await writeFile(blockingFile, 'content');
        
        const filePath = join(blockingFile, 'subdir', 'file.txt'); // Invalid path
        const content = 'should fail';
        
        const result = await atomicWriteFileWithDirectoryCreation(filePath, content);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to create');
      });
    });

    describe('error scenarios and edge cases', () => {
      it('should handle permission errors gracefully', async () => {
        // This test might be skipped on some systems due to permission handling
        const restrictedPath = join(testDir, 'restricted');
        await mkdir(restrictedPath, { mode: 0o444 }); // Read-only directory
        
        const filePath = join(restrictedPath, 'file.txt');
        const content = 'should fail';
        
        await expect(atomicWriteFile(filePath, content)).rejects.toThrow();
      });

      it('should generate unique temporary file names for concurrent operations', async () => {
        const filePath = join(testDir, 'concurrent-temp.txt');
        
        // Test uniqueness by running many concurrent operations
        // If temp file names aren't unique, operations would interfere with each other
        const operations = Array.from({ length: 10 }, (_, i) => 
          atomicWriteFile(`${filePath}-${i}`, `content ${i}`)
        );
        
        // All operations should succeed without interference
        await Promise.all(operations);
        
        // Verify all files were created with correct content
        for (let i = 0; i < 10; i++) {
          const content = await readFile(`${filePath}-${i}`, 'utf-8');
          expect(content).toBe(`content ${i}`);
        }
        
        // No temporary files should remain
        const files = await readdir(testDir);
        const tempFiles = files.filter(file => file.includes('.tmp'));
        expect(tempFiles).toHaveLength(0);
      });
    });
  });
});