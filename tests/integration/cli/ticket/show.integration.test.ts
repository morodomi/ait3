import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: ticket show', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-ticket-show-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;

    // Create test ticket structure
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });

    // Create test ticket with full metadata
    await writeFile(
      join(testDir, 'todo', '0001-comprehensive-test-ticket.md'),
      `---
id: '0001'
title: 'Comprehensive Test Ticket'
status: todo
priority: high
created: '2025-01-01T10:30:00Z'
updated: '2025-01-01T11:45:00Z'
assignee: 'developer@example.com'
labels:
  - feature
  - backend
  - urgent
---
# Ticket #0001: Comprehensive Test Ticket

## Description
This is a **comprehensive** test ticket with rich markdown content.

## Requirements
- Implement feature A with proper validation
- Add comprehensive test coverage
- Update documentation

## Technical Notes
\`\`\`typescript
interface TestInterface {
  id: string;
  name: string;
}
\`\`\`

## Acceptance Criteria
- [ ] Feature implemented
- [ ] Tests pass
- [ ] Documentation updated
`
    );

    // Create minimal ticket
    await writeFile(
      join(testDir, 'doing', '0002-minimal-ticket.md'),
      `---
id: '0002'
title: 'Minimal Ticket'
status: doing
priority: medium
created: '2025-01-02T00:00:00Z'
updated: '2025-01-02T00:00:00Z'
labels: []
---
# Ticket #0002: Minimal Ticket

## Description
Simple description without assignee.
`
    );

    // Create ticket without description
    await writeFile(
      join(testDir, 'done', '0003-no-description-ticket.md'),
      `---
id: '0003'
title: 'No Description Ticket'
status: done
priority: low
created: '2025-01-03T00:00:00Z'
updated: '2025-01-03T00:00:00Z'
labels:
  - test
---
# Ticket #0003: No Description Ticket

## Description
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

  describe('successful ticket display', () => {
    it('should display comprehensive ticket details', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Check header
      expect(result).toContain('Ticket #0001');
      expect(result).toContain('Comprehensive Test Ticket');
      
      // Check metadata
      expect(result).toContain('Details:');
      expect(result).toContain('Status:');
      expect(result).toContain('todo');
      expect(result).toContain('Priority:');
      expect(result).toContain('high');
      expect(result).toContain('Created:');
      expect(result).toContain('2025-01-01 10:30');
      expect(result).toContain('Updated:');
      expect(result).toContain('2025-01-01 11:45');
      expect(result).toContain('Assignee:');
      expect(result).toContain('developer@example.com');
      expect(result).toContain('Labels:');
      expect(result).toContain('feature, backend, urgent');
      
      // Check separator
      expect(result).toContain('────');
      
      // Check content
      expect(result).toContain('Description:');
      expect(result).toContain('This is a **comprehensive** test ticket');
      expect(result).toContain('Requirements');
      expect(result).toContain('Technical Notes');
      expect(result).toContain('Acceptance Criteria');
    });

    it('should display minimal ticket correctly', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Ticket #0002');
      expect(result).toContain('Minimal Ticket');
      expect(result).toContain('Status:');
      expect(result).toContain('doing');
      expect(result).toContain('Priority:');
      expect(result).toContain('medium');
      expect(result).not.toContain('Assignee:');
      expect(result).toContain('Labels:');
      expect(result).toContain('(none)');
      expect(result).toContain('Simple description without assignee');
    });

    it('should handle ticket with minimal description content', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0003',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Ticket #0003');
      expect(result).toContain('No Description Ticket');
      expect(result).toContain('Status:');
      expect(result).toContain('done');
      expect(result).toContain('Description:');
      // The ticket has markdown template content, not empty
      expect(result).toContain('# Ticket #0003: No Description Ticket');
      expect(result).toContain('## Description');
    });

    it('should find tickets across different status directories', () => {
      // Test ticket in todo
      const todoResult = execSync(
        'node dist/cli.js ticket show 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );
      expect(todoResult).toContain('Status:');
      expect(todoResult).toContain('todo');

      // Test ticket in doing
      const doingResult = execSync(
        'node dist/cli.js ticket show 0002',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );
      expect(doingResult).toContain('Status:');
      expect(doingResult).toContain('doing');

      // Test ticket in done
      const doneResult = execSync(
        'node dist/cli.js ticket show 0003',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );
      expect(doneResult).toContain('Status:');
      expect(doneResult).toContain('done');
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket show 9999',
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

      try {
        execSync(
          'node dist/cli.js ticket show 0001',
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
        expect(error.stderr || error.stdout).toContain('not found');
      }
    });
  });

  describe('input validation', () => {
    it('should handle invalid ticket ID format', () => {
      const invalidIds = ['', 'abc', '1', '00001', 'invalid'];
      
      for (const invalidId of invalidIds) {
        try {
          execSync(
            `node dist/cli.js ticket show ${invalidId}`,
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
          // Invalid ID format should produce error message
          expect(error.stderr || error.stdout).toBeTruthy();
        }
      }
    });

    it('should handle missing ticket ID argument', () => {
      try {
        execSync(
          'node dist/cli.js ticket show',
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
        // Should show error for missing argument
        expect(error.stderr || error.stdout).toContain('missing required argument');
      }
    });
  });

  describe('output formatting', () => {
    it('should format dates in human-readable format', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Should format dates without ISO format
      expect(result).toContain('Created:');
      expect(result).toContain('2025-01-01 10:30');
      expect(result).toContain('Updated:');
      expect(result).toContain('2025-01-01 11:45');
      expect(result).not.toContain('T10:30:00Z');
    });

    it('should use colorized output', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Should contain ANSI color codes
      expect(result).toMatch(/\[3\d*m/); // ANSI color codes for colors
    });

    it('should include proper section separators', () => {
      const result = execSync(
        'node dist/cli.js ticket show 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Details:');
      expect(result).toContain('────');
      expect(result).toContain('Description:');
    });
  });

  describe('help and documentation', () => {
    it('should show help for show subcommand', () => {
      const result = execSync(
        'node dist/cli.js ticket show --help',
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      expect(result).toContain('Show ticket details');
      expect(result).toContain('Usage:');
      expect(result).toContain('<id>');
    });
  });
});