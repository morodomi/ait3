import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: flow plan', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-flow-plan-${hash}-`);
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

  describe('basic flow plan command', () => {
    it('should show help when no arguments provided', () => {
      try {
        execSync('node dist/cli.js flow plan', {
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

    it('should execute with local ticket ID', () => {
      // First create a ticket using the CLI
      execSync('node dist/cli.js ticket create "Test Planning Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('PLANNING Phase');
      expect(result).toContain('Claude Code Instructions');
      expect(result).toContain('TODO: Next actions for AI');
      expect(result).toContain('test-planning-feature'); // Converted to kebab-case
    });

    it('should support express mode flag', () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Quick Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan 0001 --mode express', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('PLANNING Phase (Express)');
      expect(result).toContain('quick-feature');
      // Should not include interactive choices
      expect(result).not.toContain('[1]');
    });

    it('should support manual mode flag', () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Manual Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan 0001 --mode manual', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Dialectical Process');
      expect(result).toContain('Claude proposes');
      expect(result).toContain('Gemini refutes');
      expect(result).toContain('Human decides');
    });
  });

  describe('requirements flag', () => {
    it('should accept requirements comma-separated', () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Auth Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan 0001 --requirements "security,oauth,jwt"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('security');
      expect(result).toContain('oauth');
      expect(result).toContain('jwt');
    });

    it('should work without requirements flag', () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Simple Feature"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Claude Code Instructions');
      expect(result).toContain('simple-feature');
    });
  });

  describe('ticket integration', () => {
    it('should show error for non-existent ticket', () => {
      try {
        execSync('node dist/cli.js flow plan 9999', {
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

    it('should accept GitHub-style ticket IDs', () => {
      // This will fail with local backend, but should validate the ID format
      try {
        execSync('node dist/cli.js flow plan 72', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain("Ticket with ID '72' not found");
      }
    });

    it('should show error for invalid ticket ID format', () => {
      try {
        execSync('node dist/cli.js flow plan invalid-id', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir },
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain("Invalid ticket ID format");
      }
    });
  });

  describe('flow command structure', () => {
    it('should show flow help with plan subcommand', () => {
      const result = execSync('node dist/cli.js flow --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('AIT³ workflow commands');
      expect(result).toContain('plan');
      expect(result).toContain('AI + Ticket + Test + Tool');
    });

    it('should show plan subcommand help', () => {
      const result = execSync('node dist/cli.js flow plan --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('PLANNING Phase');
      expect(result).toContain('--mode');
      expect(result).toContain('--requirements');
      expect(result).toContain('<ticketId>');
    });
  });

  describe('error handling', () => {
    it('should validate mode flag values', () => {
      // First create a ticket
      execSync('node dist/cli.js ticket create "Test Mode Validation"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      try {
        execSync('node dist/cli.js flow plan 0001 --mode invalid', {
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
});