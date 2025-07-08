import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: flow squash', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-flow-squash-${hash}-`);
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

  describe('basic flow squash command', () => {
    it('should show help when no arguments provided', () => {
      expect(() => {
        execSync('node dist/cli.js flow squash', {
          encoding: 'utf8',
          timeout: 5000
        });
      }).toThrow(/missing required argument 'ticketId'/);
    });

    it('should validate ticket exists', () => {
      expect(() => {
        execSync('node dist/cli.js flow squash 9999', {
          encoding: 'utf8',
          timeout: 5000,
          env: { ...process.env, TICKETS_DIR: testDir }
        });
      }).toThrow(/Ticket with ID '9999' not found/);
    });

    it('should auto-complete tickets and provide suggestions', async () => {
      // Create ticket but don't start it (todo status)
      execSync('node dist/cli.js ticket create "Test squash phase"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Automatically completed ticket #0001');
      expect(result).toContain('SQUASH Phase');
    });

    it('should show Git suggestions for valid in-progress ticket', async () => {
      // Create and start ticket
      execSync('node dist/cli.js ticket create "Feature to squash"', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      execSync('node dist/cli.js ticket start 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('SQUASH Phase');
      expect(result).toContain('Suggested Git Commands');
      expect(result).toContain('ticket #0001');
    });
  });

  describe('Git command output sections', () => {
    beforeEach(async () => {
      // Create and start a test ticket
      execSync('node dist/cli.js ticket create "Squash integration test"', {
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

    it('should display squash commands', () => {
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('git rebase -i main');
      expect(result).toContain('Squash commits into logical units');
      expect(result).toContain('Mark commits to squash');
    });

    it('should show commit message templates', () => {
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('git commit --amend');
      expect(result).toContain('feat(#0001)');
      expect(result).toContain('comprehensive commit message');
    });

    it('should provide push commands with safety', () => {
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('git push origin');
      expect(result).toContain('--force-with-lease');
    });

    it('should include merge workflow', () => {
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('git checkout main');
      expect(result).toContain('git merge');
      expect(result).toContain('git pull origin main');
    });

    it('should provide next steps', () => {
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('Next Action');
      expect(result).toContain('Squash commits');
      expect(result).toContain('git rebase -i main');
    });
  });

  describe('command options', () => {
    beforeEach(async () => {
      execSync('node dist/cli.js ticket create "Options test ticket"', {
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

    it('should support --pr flag', () => {
      const result = execSync('node dist/cli.js flow squash 0001 --pr', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('gh pr create');
      expect(result).toContain('Create Pull Request');
    });

    it('should support --no-squash flag', () => {
      const result = execSync('node dist/cli.js flow squash 0001 --no-squash', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).not.toContain('git rebase -i');
      expect(result).toContain('git merge');
    });

    it('should support --dry-run flag', () => {
      const result = execSync('node dist/cli.js flow squash 0001 --dry-run', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('DRY RUN');
      expect(result).toContain('Preview mode');
    });

    it('should support combined flags', () => {
      const result = execSync('node dist/cli.js flow squash 0001 --pr --no-squash', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('gh pr create');
      expect(result).not.toContain('git rebase -i');
    });
  });

  describe('custom ticket scenarios', () => {
    it('should customize output based on ticket information', async () => {
      // Create ticket with specific details
      const ticketContent = `---
id: '0001'
title: 'feat: custom squash test - Enhanced UI'
status: doing
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['enhancement', 'ui']
started: '2025-07-07T10:00:00.000Z'
---
# Ticket #0001: feat: custom squash test - Enhanced UI

## Description
Custom test for squash command customization`;

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
        join(testDir, 'doing', '0001-feat-custom-squash-test-enhanced-ui.md'),
        ticketContent
      );

      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('feat(#0001): custom squash test');
      expect(result).toContain('feature/0001');
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

      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });
      
      expect(result).toContain('Note: Ticket is already completed');
      expect(result).toContain('Suggested Git Commands');
    });
  });

  describe('flow command help', () => {
    it('should show squash subcommand in flow help', () => {
      const result = execSync('node dist/cli.js flow --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('squash');
      expect(result).toContain('SQUASH Phase');
    });

    it('should show squash subcommand specific help', () => {
      const result = execSync('node dist/cli.js flow squash --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Git command suggestions');
      expect(result).toContain('--pr');
      expect(result).toContain('--no-squash');
      expect(result).toContain('--dry-run');
    });
  });

  describe('integration with flow workflow', () => {
    it('should work as final step in complete flow', async () => {
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

      // Previous phases would have been: plan → red → green → refactor

      // Squash phase (final step)
      const result = execSync('node dist/cli.js flow squash 0001', {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TICKETS_DIR: testDir }
      });

      expect(result).toContain('SQUASH Phase');
      expect(result).toContain('final step in AIT³ workflow');
      expect(result).toContain('Automatically completed ticket');
    });
  });
});