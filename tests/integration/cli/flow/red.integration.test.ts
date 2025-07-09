import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: flow red', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-flow-red-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;
  });

  afterEach(async () => {
    // Restore original environment
    process.env.TICKETS_DIR = originalTicketsDir;
    
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic flow red command', () => {
    it('should show help when no arguments provided', () => {
      try {
        execSync('node dist/cli.js flow red', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain("missing required argument 'ticketId'");
      }
    });

    it('should validate ticket exists', () => {
      try {
        execSync('node dist/cli.js flow red 9999', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain("Ticket with ID '9999' not found");
      }
    });

    it('should generate unit test for valid ticket', async () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Test RED phase feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow red 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Unit test generated');
      expect(result).toContain('0% pass rate');
    });
  });

  describe('test type options', () => {
    beforeEach(async () => {
      // Create a test ticket
      execSync('node dist/cli.js ticket create "Feature with test types"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
    });

    it('should support --type unit flag', () => {
      const result = execSync('node dist/cli.js flow red 0001 --type unit', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Unit test generated');
      expect(result).not.toContain('Integration test generated');
    });

    it('should support --type integration flag', () => {
      const result = execSync('node dist/cli.js flow red 0001 --type integration', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Integration test generated');
      expect(result).not.toContain('Unit test generated');
    });

    it('should support --type both flag', () => {
      const result = execSync('node dist/cli.js flow red 0001 --type both', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Unit test generated');
      expect(result).toContain('Integration test generated');
    });

    it('should validate type flag values', () => {
      try {
        execSync('node dist/cli.js flow red 0001 --type invalid', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });
  });

  describe('interactive and dry-run modes', () => {
    beforeEach(async () => {
      // Create a test ticket
      execSync('node dist/cli.js ticket create "Interactive feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
    });

    it('should support --interactive flag', () => {
      const result = execSync('node dist/cli.js flow red 0001 --interactive', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Interactive mode');
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });

    it('should support --dry-run flag', () => {
      const result = execSync('node dist/cli.js flow red 0001 --dry-run', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('DRY RUN');
      expect(result).toContain('Would execute');
    });
  });

  describe('ticket with acceptance criteria', () => {
    it('should parse acceptance criteria from ticket', async () => {
      // Create directory structure
      await mkdir(join(testDir, 'todo'), { recursive: true });
      await mkdir(join(testDir, 'doing'), { recursive: true });
      await mkdir(join(testDir, 'done'), { recursive: true });
      
      // Create config file
      const config = {
        backend: 'local',
        path: testDir,
        numbering: {
          format: '0000',
          increment: 1,
          next: 2
        },
        templates: {},
        labels: {
          priority: ['low', 'medium', 'high', 'critical'],
          type: [],
          status: ['todo', 'doing', 'done']
        }
      };
      await writeFile(join(testDir, 'config.json'), JSON.stringify(config, null, 2));
      
      // Create ticket with detailed content
      const ticketContent = `---
id: '0001'
title: 'User Registration'
status: todo
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['auth', 'user']
---
# Ticket #0001: User Registration

## Description
Implement user registration functionality

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Email must be unique
- [ ] Password must be at least 8 characters
- [ ] Send welcome email after registration`;
      await writeFile(
        join(testDir, 'todo', '0001-user-registration.md'),
        ticketContent
      );

      const result = execSync('node dist/cli.js flow red 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('4 test cases generated');
      expect(result).toContain('from acceptance criteria');
    });
  });

  describe('flow command help', () => {
    it('should show red subcommand in flow help', () => {
      const result = execSync('node dist/cli.js flow --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('red');
      expect(result).toContain('RED Phase');
    });

    it('should show red subcommand specific help', () => {
      const result = execSync('node dist/cli.js flow red --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Generate failing tests');
      expect(result).toContain('--type');
      expect(result).toContain('--interactive');
      expect(result).toContain('--dry-run');
    });
  });

  describe('error scenarios', () => {
    it('should handle ticket in wrong status gracefully', async () => {
      // Create and start a ticket
      execSync('node dist/cli.js ticket create "In Progress Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow red 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Warning: Ticket is already in progress');
    });

    it('should reject completed tickets', async () => {
      // Create, start, and complete a ticket
      execSync('node dist/cli.js ticket create "Completed Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket complete 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      try {
        execSync('node dist/cli.js flow red 0001', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain('already completed');
      }
    });
  });
});