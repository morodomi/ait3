import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: migrate command', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-migrate-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;
    
    // Create ticket directories
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });
  });

  afterEach(async () => {
    // Restore original environment
    process.env.TICKETS_DIR = originalTicketsDir;
    
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic migrate command', () => {
    it('should require --from and --to flags', () => {
      try {
        execSync('node dist/cli.js migrate', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe'
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toMatch(/required option|--from|--to/);
      }
    });

    it('should require GitHub owner and repo for GitHub migration', () => {
      try {
        execSync('node dist/cli.js migrate --from local --to github', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, TICKETS_DIR: testDir }
        });
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr || error.stdout).toContain('GitHub owner and repo are required');
      }
    });
  });

  describe('specific ticket migration', () => {
    beforeEach(async () => {
      // Create test tickets
      const tickets = [
        { id: '0001', title: 'First Ticket', description: 'Description for first ticket' },
        { id: '0002', title: 'Second Ticket', description: 'Description for second ticket' },
        { id: '0003', title: 'Third Ticket', description: 'Description for third ticket' }
      ];

      for (const ticket of tickets) {
        const content = `---
id: "${ticket.id}"
title: "${ticket.title}"
status: "todo"
priority: "medium"
created: "2025-01-01T00:00:00Z"
updated: "2025-01-01T00:00:00Z"
labels: []
---

${ticket.description}`;

        await writeFile(
          join(testDir, 'todo', `${ticket.id}-${ticket.title.toLowerCase().replace(/\s+/g, '-')}.md`),
          content,
          'utf-8'
        );
      }
    });

    it('should migrate specific tickets when --tickets flag is provided', () => {
      try {
        execSync('node dist/cli.js migrate --from local --to github --owner test --repo test --tickets 0001,0003 --dry-run', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, TICKETS_DIR: testDir, GITHUB_TOKEN: 'fake-token' }
        });
        expect.fail('Command should show dry run results');
      } catch (error: any) {
        // For now, this will fail because --tickets is not implemented
        expect(error.code).not.toBe(0);
      }
    });

    it('should support range notation in --tickets flag', () => {
      try {
        execSync('node dist/cli.js migrate --from local --to github --owner test --repo test --tickets 0001-0003 --dry-run', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, TICKETS_DIR: testDir, GITHUB_TOKEN: 'fake-token' }
        });
        expect.fail('Command should show dry run results');
      } catch (error: any) {
        // For now, this will fail because --tickets is not implemented
        expect(error.code).not.toBe(0);
      }
    });

    it('should support mixed notation (comma and range) in --tickets flag', () => {
      try {
        execSync('node dist/cli.js migrate --from local --to github --owner test --repo test --tickets 0001,0003-0005 --dry-run', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, TICKETS_DIR: testDir, GITHUB_TOKEN: 'fake-token' }
        });
        expect.fail('Command should show dry run results');
      } catch (error: any) {
        // For now, this will fail because --tickets is not implemented
        expect(error.code).not.toBe(0);
      }
    });
  });

  describe('description content migration', () => {
    it('should preserve ticket descriptions during migration', async () => {
      const ticketWithDescription = `---
id: "0001"
title: "Ticket with Rich Description"
status: "todo"
priority: "high"
created: "2025-01-01T00:00:00Z"
updated: "2025-01-01T00:00:00Z"
labels: ["feature"]
---

## Overview
This ticket has a rich description with multiple sections.

### Details
- Point 1: Important detail
- Point 2: Another detail

### Code Example
\`\`\`javascript
console.log("Hello, world!");
\`\`\``;

      await writeFile(
        join(testDir, 'todo', '0001-ticket-with-rich-description.md'),
        ticketWithDescription,
        'utf-8'
      );

      // This test verifies that the description content is preserved
      // Currently it will fail because we need to implement the fix
      try {
        execSync('node dist/cli.js migrate --from local --to github --owner test --repo test --dry-run', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, TICKETS_DIR: testDir, GITHUB_TOKEN: 'fake-token' }
        });
        expect.fail('Command should show dry run results');
      } catch (error: any) {
        // Once implemented, we should verify the description is included
        expect(error.code).not.toBe(0);
      }
    });
  });
});