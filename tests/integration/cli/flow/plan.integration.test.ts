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
        expect(error.stderr || error.stdout).toContain("missing required argument 'featureName'");
      }
    });

    it('should execute guided mode by default', () => {
      const result = execSync('node dist/cli.js flow plan "test-feature"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('PLANNING Phase');
      expect(result).toContain('Claude Code Instructions');
      expect(result).toContain('Next Action');
      expect(result).toContain('test-feature');
    });

    it('should support express mode flag', () => {
      const result = execSync('node dist/cli.js flow plan "quick-feature" --mode express', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('PLANNING Phase (Express)');
      expect(result).toContain('quick-feature');
      // Should not include interactive choices
      expect(result).not.toContain('[1]');
    });

    it('should support manual mode flag', () => {
      const result = execSync('node dist/cli.js flow plan "manual-feature" --mode manual', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Dialectical Process');
      expect(result).toContain('Claude proposes');
      expect(result).toContain('Gemini refutes');
      expect(result).toContain('Human decides');
    });
  });

  describe('requirements flag', () => {
    it('should accept requirements comma-separated', () => {
      const result = execSync('node dist/cli.js flow plan "auth-feature" --requirements "security,oauth,jwt"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('security');
      expect(result).toContain('oauth');
      expect(result).toContain('jwt');
    });

    it('should work without requirements flag', () => {
      const result = execSync('node dist/cli.js flow plan "simple-feature"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Claude Code Instructions');
      expect(result).toContain('simple-feature');
    });
  });

  describe('ticket integration', () => {
    it('should work without ticket flag', () => {
      const result = execSync('node dist/cli.js flow plan "standalone-feature"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Claude Code Instructions');
      expect(result).toContain('standalone-feature');
    });

    it('should reference ticket when provided', () => {
      // First create a ticket using the CLI
      execSync('node dist/cli.js ticket create "Test Planning Integration"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow plan "integration-test" --ticket 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Ticket #0001') || expect(result).toContain('integration-test');
    });

    it('should handle invalid ticket ID gracefully', () => {
      const result = execSync('node dist/cli.js flow plan "test-feature" --ticket 9999', {
        encoding: 'utf8',
        timeout: 5000
      });

      // Should not crash, should show planning phase output
      expect(result).toContain('PLANNING Phase') || expect(result).toContain('Claude Code Instructions');
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
      expect(result).toContain('--ticket');
    });
  });

  describe('error handling', () => {
    it('should validate mode flag values', () => {
      try {
        execSync('node dist/cli.js flow plan "test" --mode invalid', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should handle special characters in feature name', () => {
      const result = execSync('node dist/cli.js flow plan "feature-with-dashes_and_underscores"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('feature-with-dashes_and_underscores');
    });

    it('should handle quoted feature names with spaces', () => {
      const result = execSync('node dist/cli.js flow plan "Feature With Spaces"', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Feature With Spaces');
    });
  });
});