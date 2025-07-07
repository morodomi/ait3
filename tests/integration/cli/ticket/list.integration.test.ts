import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: ticket list', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-synapse-cli-ticket-list-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;

    // Create test ticket structure
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });

    // Create test tickets
    await writeFile(
      join(testDir, 'todo', '0001-test-todo-ticket.md'),
      `---
id: '0001'
title: 'Test Todo Ticket'
status: todo
priority: high
created: '2025-01-01T00:00:00Z'
updated: '2025-01-01T00:00:00Z'
labels:
  - test
---
# Ticket #0001: Test Todo Ticket

## Description
Test ticket in todo status
`
    );

    await writeFile(
      join(testDir, 'doing', '0002-test-doing-ticket.md'),
      `---
id: '0002'
title: 'Test Doing Ticket'
status: doing
priority: medium
created: '2025-01-02T00:00:00Z'
updated: '2025-01-02T00:00:00Z'
labels:
  - test
  - important
---
# Ticket #0002: Test Doing Ticket

## Description
Test ticket in doing status
`
    );

    await writeFile(
      join(testDir, 'done', '0003-test-done-ticket.md'),
      `---
id: '0003'
title: 'Test Done Ticket'
status: done
priority: low
created: '2025-01-03T00:00:00Z'
updated: '2025-01-03T00:00:00Z'
labels: []
---
# Ticket #0003: Test Done Ticket

## Description
Test ticket in done status
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

  describe('basic list functionality', () => {
    it('should list all tickets by default', () => {
      const result = execSync(
        'node dist/cli.js ticket list',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 3 tickets');
      expect(result).toContain('Test Todo Ticket');
      expect(result).toContain('Test Doing Ticket');
      expect(result).toContain('Test Done Ticket');
      expect(result).toContain('#0001');
      expect(result).toContain('#0002');
      expect(result).toContain('#0003');
    });

    it('should show table headers', () => {
      const result = execSync(
        'node dist/cli.js ticket list',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('ID');
      expect(result).toContain('Title');
      expect(result).toContain('Status');
      expect(result).toContain('Priority');
    });

    it('should handle empty ticket directory', async () => {
      // Clear all tickets
      await rm(join(testDir, 'todo'), { recursive: true, force: true });
      await rm(join(testDir, 'doing'), { recursive: true, force: true });
      await rm(join(testDir, 'done'), { recursive: true, force: true });
      await mkdir(join(testDir, 'todo'), { recursive: true });
      await mkdir(join(testDir, 'doing'), { recursive: true });
      await mkdir(join(testDir, 'done'), { recursive: true });

      const result = execSync(
        'node dist/cli.js ticket list',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('No tickets found');
    });
  });

  describe('status filtering', () => {
    it('should filter by todo status', () => {
      const result = execSync(
        'node dist/cli.js ticket list --status todo',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Doing Ticket');
      expect(result).not.toContain('Test Done Ticket');
    });

    it('should filter by doing status', () => {
      const result = execSync(
        'node dist/cli.js ticket list --status doing',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Doing Ticket');
      expect(result).not.toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Done Ticket');
    });

    it('should filter by done status', () => {
      const result = execSync(
        'node dist/cli.js ticket list --status done',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Done Ticket');
      expect(result).not.toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Doing Ticket');
    });

    it('should handle invalid status gracefully', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket list --status invalid',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should exit with non-zero code
    });
  });

  describe('priority filtering', () => {
    it('should filter by high priority', () => {
      const result = execSync(
        'node dist/cli.js ticket list --priority high',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Doing Ticket');
      expect(result).not.toContain('Test Done Ticket');
    });

    it('should filter by medium priority', () => {
      const result = execSync(
        'node dist/cli.js ticket list --priority medium',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Doing Ticket');
      expect(result).not.toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Done Ticket');
    });

    it('should handle invalid priority gracefully', () => {
      expect(() => {
        execSync(
          'node dist/cli.js ticket list --priority invalid',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should exit with non-zero code
    });
  });

  describe('combined filtering', () => {
    it('should filter by both status and priority', () => {
      const result = execSync(
        'node dist/cli.js ticket list --status todo --priority high',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Found 1 tickets');
      expect(result).toContain('Test Todo Ticket');
      expect(result).not.toContain('Test Doing Ticket');
      expect(result).not.toContain('Test Done Ticket');
    });

    it('should return no results when filters match nothing', () => {
      const result = execSync(
        'node dist/cli.js ticket list --status done --priority high',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('No tickets found');
    });
  });

  describe('help and documentation', () => {
    it('should show help for list subcommand', () => {
      const result = execSync(
        'node dist/cli.js ticket list --help',
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      expect(result).toContain('List tickets');
      expect(result).toContain('--status');
      expect(result).toContain('--priority');
    });
  });
});