import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: flow refactor', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-flow-refactor-${hash}-`);
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

  describe('basic flow refactor command', () => {
    it('should show help when no arguments provided', () => {
      expect(() => {
        execSync('node dist/cli.js flow refactor', {
          encoding: 'utf8',
          timeout: 5000
        });
      }).toThrow(/missing required argument 'ticketId'/);
    });

    it('should validate ticket exists', () => {
      expect(() => {
        execSync('node dist/cli.js flow refactor 9999', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir }
        });
      }).toThrow(/Ticket with ID '9999' not found/);
    });

    it('should require ticket to be in progress', async () => {
      // Create ticket but don't start it
      execSync('node dist/cli.js ticket create "Test refactor phase"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(() => {
        execSync('node dist/cli.js flow refactor 0001', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir }
        });
      }).toThrow(/must be in progress/);
    });

    it('should show analysis for valid in-progress ticket', async () => {
      // Create and start ticket
      execSync('node dist/cli.js ticket create "Feature to refactor"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('REFACTOR Phase');
      expect(result).toContain('REFACTOR Phase');
      expect(result).toContain('for Ticket #0001: Feature to refactor');
    });
  });

  describe('analysis output sections', () => {
    beforeEach(async () => {
      // Create and start a test ticket
      execSync('node dist/cli.js ticket create "Refactor analysis test"', {
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

    it('should display code quality summary', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Code Quality Summary');
      expect(result).toContain('Files analyzed');
      expect(result).toContain('Improvement opportunities');
      expect(result).toContain('Estimated effort');
    });

    it('should show refactoring suggestions', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Refactoring Suggestions');
      expect(result).toContain('Code Duplication');
      expect(result).toContain('Mock Implementations');
      expect(result).toContain('Type Improvements');
      expect(result).toContain('Code Organization');
    });

    it('should provide next steps', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Next Action');
      expect(result).toContain('Review analysis');
      expect(result).toContain('Apply improvements');
    });
  });

  describe('verbose option', () => {
    beforeEach(async () => {
      execSync('node dist/cli.js ticket create "Verbose option test"', {
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
      const result = execSync('node dist/cli.js flow refactor 0001 --verbose', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Detailed Analysis');
      expect(result).toContain('Line-by-line');
    });

    it('should show minimal output by default', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).not.toContain('Detailed Analysis');
      expect(result).toContain('Refactoring Suggestions');
    });
  });

  describe('focus option', () => {
    beforeEach(async () => {
      execSync('node dist/cli.js ticket create "Focus option test"', {
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

    it('should support --focus flag with single area', () => {
      const result = execSync('node dist/cli.js flow refactor 0001 --focus mocks', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Mock Implementations');
      expect(result).toContain('Focused Analysis: mocks');
    });

    it('should support --focus flag with multiple areas', () => {
      const result = execSync('node dist/cli.js flow refactor 0001 --focus mocks,duplication', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Mock Implementations');
      expect(result).toContain('Code Duplication');
      expect(result).toContain('Focused Analysis: mocks, duplication');
    });

    it('should validate focus areas', () => {
      expect(() => {
        execSync('node dist/cli.js flow refactor 0001 --focus invalid', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir }
        });
      }).toThrow(/Invalid focus area/);
    });
  });

  describe('mock detection and ticket suggestions', () => {
    beforeEach(async () => {
      // Create ticket with mock-related context
      const ticketContent = `---
id: '0001'
title: 'Feature with mocks'
status: doing
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['feature', 'backend']
started: '2025-07-07T10:00:00.000Z'
---
# Ticket #0001: Feature with mocks

## Description
Feature that has mock implementations from GREEN phase`;

      await mkdir(join(testDir, 'todo'), { recursive: true });
      await mkdir(join(testDir, 'doing'), { recursive: true });
      await mkdir(join(testDir, 'done'), { recursive: true });
      
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
          type: ['feature', 'bug', 'task', 'spike'],
          status: ['todo', 'doing', 'done']
        }
      };
      
      await writeFile(
        join(testDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      await writeFile(
        join(testDir, 'doing', '0001-feature-with-mocks.md'),
        ticketContent
      );
    });

    it('should detect mock implementations', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Mock Implementations');
      expect(result).toContain('EmailService');
      expect(result).toContain('Create ticket');
    });

    it('should suggest ticket creation commands', () => {
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('ait3 ticket create');
      expect(result).toContain('--labels');
    });
  });

  describe('flow command help', () => {
    it('should show refactor subcommand in flow help', () => {
      const result = execSync('node dist/cli.js flow --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('refactor');
      expect(result).toContain('REFACTOR Phase');
    });

    it('should show refactor subcommand specific help', () => {
      const result = execSync('node dist/cli.js flow refactor --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Analyze and suggest');
      expect(result).toContain('--verbose');
      expect(result).toContain('--focus');
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

      expect(() => {
        execSync('node dist/cli.js flow refactor 0001', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir }
        });
      }).toThrow(/already completed/);
    });

    it('should handle missing project files gracefully', async () => {
      execSync('node dist/cli.js ticket create "Empty project"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('REFACTOR Phase');
      expect(result).toContain('Limited analysis');
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
      // Green phase (would have implemented)

      // Refactor phase
      const result = execSync('node dist/cli.js flow refactor 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('REFACTOR Phase');
      expect(result).toContain('After refactoring: ait3 flow squash');
    });
  });
});