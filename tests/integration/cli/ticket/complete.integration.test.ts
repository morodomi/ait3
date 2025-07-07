import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir, readFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import matter from 'gray-matter';

describe('CLI Integration: ticket complete', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-synapse-cli-ticket-complete-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;

    // Create test ticket structure
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });

    // Create test tickets in todo status
    await writeFile(
      join(testDir, 'todo', '0001-not-started-ticket.md'),
      `---
id: '0001'
title: 'Not Started Ticket'
status: todo
priority: high
created: '2025-01-01T10:30:00Z'
updated: '2025-01-01T10:30:00Z'
labels:
  - feature
  - backend
---
# Ticket #0001: Not Started Ticket

## Description
This ticket has not been started yet and should not be completable.

## Requirements
- Cannot be completed until started
`
    );

    // Create ticket already in doing status
    await writeFile(
      join(testDir, 'doing', '0002-ready-to-complete.md'),
      `---
id: '0002'
title: 'Ready to Complete'
status: doing
priority: medium
created: '2025-01-02T00:00:00Z'
updated: '2025-01-02T01:00:00Z'
started: '2025-01-02T01:00:00Z'
labels: []
---
# Ticket #0002: Ready to Complete

## Description
This ticket is in progress and ready to be completed.
`
    );

    // Create ticket already completed
    await writeFile(
      join(testDir, 'done', '0003-already-completed.md'),
      `---
id: '0003'
title: 'Already Completed'
status: done
priority: low
created: '2025-01-03T00:00:00Z'
updated: '2025-01-03T02:00:00Z'
started: '2025-01-03T01:00:00Z'
completed: '2025-01-03T02:00:00Z'
labels:
  - test
---
# Ticket #0003: Already Completed

## Description
This ticket is already completed.
`
    );

    // Create config.json
    await writeFile(
      join(testDir, 'config.json'),
      JSON.stringify({
        backend: 'local',
        path: testDir,
        numbering: { format: '0000', increment: 1, next: 4 }
      }, null, 2)
    );
  });

  afterEach(async () => {
    // Restore original tickets directory
    process.env.TICKETS_DIR = originalTicketsDir;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('successful ticket completion', () => {
    it('should complete ticket and move file from doing to done', async () => {
      const result = execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Check command output
      expect(result).toContain('✅ Completed ticket #0002');
      expect(result).toContain('doing → done');
      expect(result).toContain('Ready to Complete');

      // Verify file was moved from doing to done
      try {
        await access(join(testDir, 'doing', '0002-ready-to-complete.md'));
        expect.fail('File should have been moved from doing directory');
      } catch {
        // Expected - file should not exist in doing
      }

      // Verify file exists in done directory
      const doneFilePath = join(testDir, 'done', '0002-ready-to-complete.md');
      await access(doneFilePath);

      // Verify file content and metadata update
      const fileContent = await readFile(doneFilePath, 'utf-8');
      const { data } = matter(fileContent);
      
      expect(data.id).toBe('0002');
      expect(data.status).toBe('done');
      expect(data.title).toBe('Ready to Complete');
      expect(new Date(data.updated).getTime()).toBeGreaterThan(new Date(data.created).getTime());
    });

    it('should update ticket metadata correctly', async () => {
      const beforeTime = new Date().toISOString();
      
      execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      const filePath = join(testDir, 'done', '0002-ready-to-complete.md');
      const fileContent = await readFile(filePath, 'utf-8');
      const { data } = matter(fileContent);
      
      // Check status update
      expect(data.status).toBe('done');
      
      // Check timestamp update
      expect(data.updated).not.toBe(data.created);
      expect(new Date(data.updated).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      
      // Check completed timestamp was added
      expect(data.completed).toBeDefined();
      expect(data.completed).toBe(data.updated); // Should be same as updated time
      expect(new Date(data.completed).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      
      // Verify other metadata preserved
      expect(data.id).toBe('0002');
      expect(data.title).toBe('Ready to Complete');
      expect(data.priority).toBe('medium');
      expect(data.started).toBe('2025-01-02T01:00:00Z');
    });

    it('should preserve markdown content during move', async () => {
      execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      const filePath = join(testDir, 'done', '0002-ready-to-complete.md');
      const fileContent = await readFile(filePath, 'utf-8');
      const { content } = matter(fileContent);
      
      expect(content).toContain('# Ticket #0002: Ready to Complete');
      expect(content).toContain('## Description');
      expect(content).toContain('This ticket is in progress and ready to be completed');
    });
  });

  describe('ticket status validation', () => {
    it('should handle ticket not yet started gracefully', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket complete 0001',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should exit with non-zero code

      // Capture stderr to check error message
      try {
        execSync(
          'node dist/cli.js ticket complete 0001',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain("Ticket with ID '0001' has not been started yet");
      }
    });

    it('should handle ticket already completed gracefully', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket complete 0003',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should exit with non-zero code

      // Capture stderr to check error message
      try {
        execSync(
          'node dist/cli.js ticket complete 0003',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain("Ticket with ID '0003' is already completed");
      }
    });

    it('should not modify files when validation fails', async () => {
      // Capture original file content
      const originalFilePath = join(testDir, 'done', '0003-already-completed.md');
      const originalContent = await readFile(originalFilePath, 'utf-8');

      try {
        execSync(
          'node dist/cli.js ticket complete 0003',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      } catch {
        // Expected to fail
      }

      // Verify file content unchanged
      const afterContent = await readFile(originalFilePath, 'utf-8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket complete 9999',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should exit with non-zero code

      // Capture stderr to check error message
      try {
        execSync(
          'node dist/cli.js ticket complete 9999',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain("Ticket with ID '9999' not found");
      }
    });

    it('should handle empty ticket directory', async () => {
      // Clear all tickets
      await rm(join(testDir, 'todo'), { recursive: true, force: true });
      await rm(join(testDir, 'doing'), { recursive: true, force: true });
      await rm(join(testDir, 'done'), { recursive: true, force: true });
      await mkdir(join(testDir, 'todo'), { recursive: true });
      await mkdir(join(testDir, 'doing'), { recursive: true });
      await mkdir(join(testDir, 'done'), { recursive: true });

      expect(() => {
        execSync(
          'node dist/cli.js ticket complete 0002',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow();
    });
  });

  describe('input validation', () => {
    it('should handle invalid ticket ID format', () => {
      const invalidIds = ['', 'abc', '1', '00001', 'invalid'];
      
      for (const invalidId of invalidIds) {
        expect(() => {
          execSync(
            `node dist/cli.js ticket complete ${invalidId}`,
            {
              encoding: 'utf8',
              timeout: 5000,
              env: { ...process.env, TICKETS_DIR: testDir }
            }
          );
        }).toThrow(); // Should exit with non-zero code
      }
    });

    it('should handle missing ticket ID argument', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket complete',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should show help and exit with non-zero code
    });
  });

  describe('output formatting', () => {
    it('should use colorized output', () => {
      const result = execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Should contain ANSI color codes
      expect(result).toMatch(/\[3\d*m/); // ANSI color codes for colors
    });

    it('should include success indicators', () => {
      const result = execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('✅');
      expect(result).toContain('Completed');
      expect(result).toContain('#0002');
    });

    it('should show status transition clearly', () => {
      const result = execSync(
        'node dist/cli.js ticket complete 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('doing → done');
    });
  });

  describe('help and documentation', () => {
    it('should show help for complete subcommand', () => {
      const result = execSync(
        'node dist/cli.js ticket complete --help',
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      expect(result).toContain('Complete a ticket');
      expect(result).toContain('Usage:');
      expect(result).toContain('<id>');
    });
  });
});