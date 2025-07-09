import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: flow green', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-flow-green-${hash}-`);
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

  describe('basic flow green command', () => {
    it('should show help when no arguments provided', () => {
      try {
        execSync('node dist/cli.js flow green', {
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
        execSync('node dist/cli.js flow green 9999', {
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

    it('should require ticket to be in progress', async () => {
      // Create ticket but don't start it
      execSync('node dist/cli.js ticket create "Test GREEN phase"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      try {
        execSync('node dist/cli.js flow green 0001', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain('must be in progress');
      }
    });

    it('should show progress for valid in-progress ticket', async () => {
      // Create and start ticket
      execSync('node dist/cli.js ticket create "Test feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow green 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('GREEN Phase');
      expect(result).toContain('Claude Code Instructions');
    });
  });

  describe('strict mode options', () => {
    beforeEach(async () => {
      // Create and start a test ticket
      execSync('node dist/cli.js ticket create "Strict mode test"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
    });

    it('should enable strict mode by default', () => {
      const result = execSync('node dist/cli.js flow green 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Strict mode enabled');
      expect(result).toContain('Test files are immutable');
    });

    it('should support --no-strict flag', () => {
      const result = execSync('node dist/cli.js flow green 0001 --no-strict', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Strict mode disabled');
      expect(result).toContain('Test modifications allowed');
    });

    it('should support explicit --strict flag', () => {
      const result = execSync('node dist/cli.js flow green 0001 --strict', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Strict mode enabled');
    });
  });

  describe('verbose and target options', () => {
    beforeEach(async () => {
      execSync('node dist/cli.js ticket create "Options test"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
    });

    it('should support --verbose flag', () => {
      const result = execSync('node dist/cli.js flow green 0001 --verbose', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Verbose mode');
      expect(result).toContain('Detailed test analysis');
    });

    it('should support --target flag', () => {
      const result = execSync('node dist/cli.js flow green 0001 --target tests/example.test.ts', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Targeting specific test');
      expect(result).toContain('tests/example.test.ts');
    });

    it('should validate target file exists', () => {
      try {
        execSync('node dist/cli.js flow green 0001 --target tests/nonexistent.test.ts', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain('Target test file not found');
      }
    });
  });

  describe('test progress display', () => {
    beforeEach(async () => {
      // Create directory structure
      await mkdir(join(testDir, 'todo'), { recursive: true });
      await mkdir(join(testDir, 'doing'), { recursive: true });
      await mkdir(join(testDir, 'done'), { recursive: true });
      
      // Create config.json for LocalTicketService
      const config = {
        backend: 'local',
        path: testDir,
        numbering: {
          format: '0000',
          increment: 1,
          next: 2  // Since we're creating ticket 0001
        },
        templates: {},
        labels: {
          priority: ['low', 'medium', 'high', 'critical'],
          type: ['feature', 'bug', 'task', 'spike'],
          status: ['todo', 'doing', 'done']
        }
      };
      
      await writeFile(
        join(testDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );
      
      // Create ticket with test-related context
      const ticketContent = `---
id: '0001'
title: 'Feature with tests'
status: doing
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['feature', 'testing']
started: '2025-07-07T10:00:00.000Z'
---
# Ticket #0001: Feature with tests

## Description
Feature that has associated tests from RED phase`;

      await writeFile(
        join(testDir, 'doing', '0001-feature-with-tests.md'),
        ticketContent
      );
    });

    it('should display test execution progress', () => {
      const result = execSync('node dist/cli.js flow green 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Progress tracking');
      expect(result).toContain('Show test results');
      expect(result).toContain('Report pass/fail count');
    });

    it('should show implementation status', () => {
      const result = execSync('node dist/cli.js flow green 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Implementation Status');
      expect(result).toContain('Follow existing patterns');
    });
  });

  describe('flow command help', () => {
    it('should show green subcommand in flow help', () => {
      const result = execSync('node dist/cli.js flow --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('green');
      expect(result).toContain('GREEN Phase');
    });

    it('should show green subcommand specific help', () => {
      const result = execSync('node dist/cli.js flow green --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Make tests pass');
      expect(result).toContain('--strict');
      expect(result).toContain('--verbose');
      expect(result).toContain('--target');
    });
  });

  describe('error scenarios', () => {
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
        execSync('node dist/cli.js flow green 0001', {
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

    it('should handle test modification warning', async () => {
      execSync('node dist/cli.js ticket create "Test modification"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      // This would normally show a warning if test files were modified
      const result = execSync('node dist/cli.js flow green 0001 --strict', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Strict mode enabled');
    });
  });

  describe('integration with flow workflow', () => {
    it('should work as part of complete flow', async () => {
      // Create ticket
      execSync('node dist/cli.js ticket create "Complete flow test"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      // Start ticket
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      // Plan phase (would have been done)
      // Red phase (would have created tests)

      // Green phase
      const result = execSync('node dist/cli.js flow green 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('GREEN Phase');
      expect(result).toContain('After 100% pass rate: ait3 flow refactor');
    });
  });
});