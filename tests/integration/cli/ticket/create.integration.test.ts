import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, access, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import matter from 'gray-matter';

describe('CLI Integration: ticket create', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-ticket-create-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;
  });

  afterEach(async () => {
    // Restore original tickets directory
    process.env.TICKETS_DIR = originalTicketsDir;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic ticket creation', () => {
    it('should create ticket via CLI with basic title', () => {
      const result = execSync(
        'node dist/cli.js ticket create "Integration Test Ticket"',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Assert CLI output format
      expect(result).toContain('SUCCESS: Ticket created successfully');
      expect(result).toContain('Integration Test Ticket');
      expect(result).toMatch(/ID: #\d{4}/); // Flexible ID matching
      expect(result).toContain('Priority: medium');
      expect(result).toContain('Status: todo');
    });

    it('should create ticket with all options', () => {
      const result = execSync(
        'node dist/cli.js ticket create "High Priority Feature" --priority high --assignee "john@example.com" --labels "feature,backend,urgent"',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Assert CLI output includes all specified options
      expect(result).toContain('SUCCESS: Ticket created successfully');
      expect(result).toContain('High Priority Feature');
      expect(result).toContain('Priority: high');
      expect(result).toContain('Assignee: john@example.com');
      expect(result).toContain('Labels: feature, backend, urgent');
    });
  });

  describe('file system integration', () => {
    it('should create actual ticket file in filesystem', async () => {
      const result = execSync(
        'node dist/cli.js ticket create "File System Test"',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Extract ticket ID from CLI output for dynamic file verification
      const idMatch = result.match(/ID: #(\d{4})/);
      expect(idMatch).toBeTruthy();
      const ticketId = idMatch![1];

      // Verify file creation with actual ID
      const expectedPath = join(testDir, 'todo', `${ticketId}-file-system-test.md`);
      await expect(access(expectedPath)).resolves.toBeUndefined();

      // Verify file content structure
      const content = await readFile(expectedPath, 'utf-8');
      const { data, content: body } = matter(content);

      expect(data).toMatchObject({
        id: ticketId,
        title: 'File System Test',
        status: 'todo',
        priority: 'medium',
        labels: []
      });
      expect(body).toContain(`# Ticket #${ticketId}: File System Test`);
    });
  });

  describe('input validation', () => {
    it('should handle invalid priority gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket create "Invalid Priority Test" --priority invalid',
          {
            encoding: 'utf8',
            timeout: 10000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should handle empty title gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket create ""',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should handle missing title gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket create',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });
  });

  describe('help and documentation', () => {
    it('should show help text for create subcommand', () => {
      const result = execSync(
        'node dist/cli.js ticket create --help',
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      expect(result).toContain('Create a new ticket');
      expect(result).toContain('-p, --priority');
      expect(result).toContain('-a, --assignee');
      expect(result).toContain('-l, --labels');
    });
  });
});