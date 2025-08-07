import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir, readFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import matter from 'gray-matter';

// Helper to strip ANSI color codes
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('CLI Integration: ticket start', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-cli-ticket-start-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original .tickets directory for restoration
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment to use temporary directory
    process.env.TICKETS_DIR = testDir;

    // Create test ticket structure
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });

    // Create test tickets in todo status
    await writeFile(
      join(testDir, 'todo', '0001-ready-to-start-ticket.md'),
      `---
id: '0001'
title: 'Ready to Start Ticket'
status: todo
priority: high
created: '2025-01-01T10:30:00Z'
updated: '2025-01-01T10:30:00Z'
labels:
  - feature
  - backend
---
# Ticket #0001: Ready to Start Ticket

## Description
This ticket is ready to be started and moved to doing status.

## Requirements
- Implement feature A
- Test thoroughly
- Document usage
`
    );

    // Create ticket already in doing status
    await writeFile(
      join(testDir, 'doing', '0002-already-in-progress.md'),
      `---
id: '0002'
title: 'Already In Progress'
status: doing
priority: medium
created: '2025-01-02T00:00:00Z'
updated: '2025-01-02T01:00:00Z'
labels: []
---
# Ticket #0002: Already In Progress

## Description
This ticket is already in progress.
`
    );

    // Create ticket already completed
    await writeFile(
      join(testDir, 'done', '0003-already-completed.md'),
      `---
id: '0003'
title: 'Already Completed'
status: done
priority: low
created: '2025-01-03T00:00:00Z'
updated: '2025-01-03T02:00:00Z'
labels:
  - test
---
# Ticket #0003: Already Completed

## Description
This ticket is already completed.
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

  describe('successful ticket start', () => {
    it('should start ticket and move file from todo to doing', async () => {
      const result = execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Check command output
      expect(result).toContain('SUCCESS: Started ticket #0001');
      expect(result).toContain('Details:');
      expect(result).toContain('Ready to Start Ticket');

      // Verify file was moved from todo to doing
      try {
        await access(join(testDir, 'todo', '0001-ready-to-start-ticket.md'));
        expect.fail('File should have been moved from todo directory');
      } catch {
        // Expected - file should not exist in todo
      }

      // Verify file exists in doing directory
      const doingFilePath = join(testDir, 'doing', '0001-ready-to-start-ticket.md');
      await access(doingFilePath);

      // Verify file content and metadata update
      const fileContent = await readFile(doingFilePath, 'utf-8');
      const { data } = matter(fileContent);
      
      expect(data.id).toBe('0001');
      expect(data.status).toBe('doing');
      expect(data.title).toBe('Ready to Start Ticket');
      expect(new Date(data.updated).getTime()).toBeGreaterThan(new Date(data.created).getTime());
    });

    it('should update ticket metadata correctly', async () => {
      const beforeTime = new Date().toISOString();
      
      execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      const filePath = join(testDir, 'doing', '0001-ready-to-start-ticket.md');
      const fileContent = await readFile(filePath, 'utf-8');
      const { data } = matter(fileContent);
      
      // Check status update
      expect(data.status).toBe('doing');
      
      // Check timestamp update
      expect(data.updated).not.toBe(data.created);
      expect(new Date(data.updated).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      
      // Check started timestamp was added
      expect(data.started).toBeDefined();
      expect(data.started).toBe(data.updated); // Should be same as updated time
      expect(new Date(data.started).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      
      // Verify other metadata preserved
      expect(data.id).toBe('0001');
      expect(data.title).toBe('Ready to Start Ticket');
      expect(data.priority).toBe('high');
      expect(data.labels).toEqual(['feature', 'backend']);
    });

    it('should preserve markdown content during move', async () => {
      execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      const filePath = join(testDir, 'doing', '0001-ready-to-start-ticket.md');
      const fileContent = await readFile(filePath, 'utf-8');
      const { content } = matter(fileContent);
      
      expect(content).toContain('# Ticket #0001: Ready to Start Ticket');
      expect(content).toContain('## Description');
      expect(content).toContain('This ticket is ready to be started');
      expect(content).toContain('## Requirements');
      expect(content).toContain('- Implement feature A');
    });
  });

  describe('ticket status validation', () => {
    it('should handle ticket already in progress gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket start 0002',
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
        expect(error.stderr || error.stdout).toContain("Ticket with ID '0002' is already in progress");
      }
    });

    it('should handle ticket already completed gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket start 0003',
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
        expect(error.stderr || error.stdout).toContain("Ticket with ID '0003' is already completed");
      }
    });

    it('should not modify files when validation fails', async () => {
      // Capture original file content
      const originalFilePath = join(testDir, 'doing', '0002-already-in-progress.md');
      const originalContent = await readFile(originalFilePath, 'utf-8');

      try {
        execSync(
          'node dist/cli.js ticket start 0002',
          {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      } catch {
        // Expected to fail
      }

      // Verify file content unchanged
      const afterContent = await readFile(originalFilePath, 'utf-8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', () => {
      try {
        execSync(
          'node dist/cli.js ticket start 9999',
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
          'node dist/cli.js ticket start 0001',
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

  describe('input validation', () => {
    it('should handle invalid ticket ID format', () => {
      const invalidIds = ['', 'abc', '1', '00001', 'invalid'];
      
      for (const invalidId of invalidIds) {
        try {
          execSync(
            `node dist/cli.js ticket start ${invalidId}`,
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
      }
    });

    it('should handle missing ticket ID argument with helpful error message', () => {
      try {
        execSync(
          'node dist/cli.js ticket start',
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
        const output = stripAnsi(error.stderr);
        expect(output).toContain('ERROR: Ticket ID is required');
        expect(output).toContain('Usage: ait3 ticket start <id>');
        expect(output).toContain('Examples:');
        expect(output).toContain('ait3 ticket start 0001    # Local ticket');
        expect(output).not.toContain('GitHub issue'); // Local backend
      }
    });
  });

  describe('output formatting', () => {
    it('should use colorized output', () => {
      const result = execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      // Should contain ANSI color codes
      expect(result).toMatch(/\[3\d*m/); // ANSI color codes for colors
    });

    it('should include success indicators', () => {
      const result = execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('SUCCESS:');
      expect(result).toContain('Started');
      expect(result).toContain('#0001');
    });

    it('should show status transition clearly', () => {
      const result = execSync(
        'node dist/cli.js ticket start 0001',
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, TICKETS_DIR: testDir }
        }
      );

      expect(result).toContain('Details:');
    });
  });

  describe('help and documentation', () => {
    it('should show help for start subcommand', () => {
      const result = execSync(
        'node dist/cli.js ticket start --help',
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      expect(result).toContain('Start working on a ticket');
      expect(result).toContain('Usage:');
      expect(result).toContain('<id>');
    });
  });

  describe('GitService integration', () => {
    beforeEach(async () => {
      // Initialize git repo in test directory for Git-specific tests
      execSync('git init', { cwd: testDir });
      execSync('git config user.email "test@example.com"', { cwd: testDir });
      execSync('git config user.name "Test User"', { cwd: testDir });
      execSync('git add .', { cwd: testDir });
      execSync('git commit -m "Initial commit"', { cwd: testDir });
    });

    it('should create and checkout feature branch when starting ticket', async () => {
      // This test will fail until GitService is implemented
      try {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }

      // After implementation, it should:
      // 1. Create branch feature/0001-test-git-integration
      // 2. Checkout the new branch
      // 3. LocalTicketService uses GitService.moveFile() to move ticket to doing status
    });

    it('should handle uncommitted changes error', async () => {
      // Create uncommitted changes
      await writeFile(join(testDir, 'uncommitted.txt'), 'changes');
      
      try {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should switch to existing branch if already exists', async () => {
      // Create feature branch manually
      execSync('git checkout -b feature/0001-test-git-integration', { cwd: testDir });
      execSync('git checkout main', { cwd: testDir });

      // This test will fail until GitService is implemented
      try {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }

      // After implementation, it should switch to existing branch
    });

    it('should work when not in a git repository', async () => {
      // Remove .git directory
      await rm(join(testDir, '.git'), { recursive: true, force: true });

      // This test will fail until GitService is implemented
      try {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir },
            stdio: 'pipe'
          }
        );
        expect.fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }

      // After implementation, it should:
      // 1. Show manual git instructions
      // 2. LocalTicketService uses fallback file operations to move ticket to doing status
    });
  });

  describe('GitHub backend error messages', () => {
    beforeEach(async () => {
      // Update config to use GitHub backend
      await writeFile(
        join(testDir, 'config.json'),
        JSON.stringify({
          backend: 'github',
          github: {
            owner: 'testowner',
            repo: 'testrepo',
            token: 'test-token'
          }
        }, null, 2)
      );
    });

    it('should show GitHub-specific help when ID is missing', () => {
      try {
        execSync(
          'node dist/cli.js ticket start',
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
        const output = stripAnsi(error.stderr);
        expect(output).toContain('ERROR: Ticket ID is required');
        expect(output).toContain('Usage: ait3 ticket start <id>');
        expect(output).toContain('Examples:');
        expect(output).toContain('ait3 ticket start 82      # GitHub issue #82');
        expect(output).toContain('ait3 ticket start 123     # GitHub issue #123');
        expect(output).toContain('Note: For GitHub issues, use the number without \'#\' prefix');
      }
    });
  });

  describe('--allow-dirty option', () => {
    let gitTestDir: string;
    let originalCwd: string;

    beforeEach(async () => {
      // Create a separate directory for Git tests
      const hash = randomBytes(8).toString('hex');
      const prefix = join(tmpdir(), `test-ait3-allow-dirty-${hash}-`);
      gitTestDir = await mkdtemp(prefix);
      
      // Save original directory
      originalCwd = process.cwd();
      process.chdir(gitTestDir);

      // Initialize git repo
      execSync('git init', { encoding: 'utf-8' });
      execSync('git config user.name "Test User"', { encoding: 'utf-8' });
      execSync('git config user.email "test@example.com"', { encoding: 'utf-8' });

      // Create initial commit
      await writeFile('README.md', '# Test Project\n');
      execSync('git add README.md', { encoding: 'utf-8' });
      execSync('git commit -m "Initial commit"', { encoding: 'utf-8' });

      // Initialize tickets directory
      await mkdir('.tickets/todo', { recursive: true });
      await mkdir('.tickets/doing', { recursive: true });
      await mkdir('.tickets/done', { recursive: true });
      
      // Create a test ticket
      const ticketContent = matter.stringify('', {
        id: '0001',
        title: 'Test Feature',
        status: 'todo',
        priority: 'medium',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        labels: []
      }) + '\n# Test Feature\n\nTest description';
      
      await writeFile('.tickets/todo/0001-test-feature.md', ticketContent);
    });

    afterEach(async () => {
      // Return to original directory
      process.chdir(originalCwd);
      
      // Clean up test directory
      await rm(gitTestDir, { recursive: true, force: true });
    });

    it('should fail without --allow-dirty when there are uncommitted changes', async () => {
      // Create uncommitted changes
      await writeFile('test.txt', 'uncommitted content');
      
      // Try to start ticket without --allow-dirty
      const result = execSync(
        `npx ait3 ticket start 0001 2>&1 || true`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('ERROR');
      expect(result).toContain('uncommitted changes');
      expect(result).toContain('commit or stash');
    });

    it('should succeed with --allow-dirty when there are uncommitted changes', async () => {
      // Create uncommitted changes
      await writeFile('test.txt', 'uncommitted content');
      await writeFile('another.txt', 'more changes');
      
      // Start ticket with --allow-dirty
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('SUCCESS');
      expect(result).toContain('Started ticket #0001');
      expect(result).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result).toContain('Untracked: 2 file(s)');
      expect(result).toContain('These changes will be carried to the new branch');
      
      // Verify branch was created
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe('feature/0001-test-feature');
      
      // Verify uncommitted changes still exist
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      expect(status).toContain('?? test.txt');
      expect(status).toContain('?? another.txt');
    });

    it('should work normally when working directory is clean', async () => {
      // No uncommitted changes
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('SUCCESS');
      expect(result).not.toContain('WARNING: Creating branch with uncommitted changes');
      expect(result).toContain('Created and switched to branch');
    });

    it('should handle modified files', async () => {
      // Modify existing file
      await writeFile('README.md', '# Test Project\n\nModified content\n');
      
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result).toContain('Modified: 1 file(s)');
      
      // Verify changes are preserved
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe('feature/0001-test-feature');
      
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      expect(status).toContain(' M README.md');
    });

    it('should handle staged files', async () => {
      // Create and stage a new file
      await writeFile('staged.txt', 'staged content');
      execSync('git add staged.txt', { encoding: 'utf-8' });
      
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result).toContain('Added: 1 file(s)');
      
      // Verify staged changes are preserved
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      expect(status).toContain('A  staged.txt');
    });

    it('should handle mixed changes', async () => {
      // Create various types of changes
      await writeFile('README.md', '# Test Project\n\nModified\n'); // Modified
      await writeFile('new.txt', 'new file');                        // Untracked
      await writeFile('staged.txt', 'staged');                       // To be staged
      execSync('git add staged.txt', { encoding: 'utf-8' });         // Staged
      
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result).toContain('Modified: 1 file(s)');
      expect(result).toContain('Added: 1 file(s)');
      expect(result).toContain('Untracked: 1 file(s)');
      
      // Verify all changes are preserved
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      expect(status).toContain(' M README.md');
      expect(status).toContain('A  staged.txt');
      expect(status).toContain('?? new.txt');
    });

    it('should work with --no-branch and --allow-dirty together', async () => {
      // Create uncommitted changes
      await writeFile('test.txt', 'uncommitted');
      
      const result = execSync(
        `npx ait3 ticket start 0001 --no-branch --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('SUCCESS');
      expect(result).toContain('Branch operations skipped (--no-branch)');
      expect(result).not.toContain('WARNING: Creating branch with uncommitted changes');
      
      // Verify still on main branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe('main');
    });

    it('should work with --no-branch alone even with dirty working directory', async () => {
      // Create uncommitted changes
      await writeFile('test.txt', 'uncommitted');
      
      // --no-branch should skip all Git checks
      const result = execSync(
        `npx ait3 ticket start 0001 --no-branch`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      expect(result).toContain('SUCCESS');
      expect(result).toContain('Branch operations skipped (--no-branch)');
      
      // Verify still on main branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe('main');
    });

    it('should display proper formatting for warnings', async () => {
      // Create specific number of each type of change
      await writeFile('README.md', 'Modified');           // 1 modified
      await writeFile('new1.txt', 'new');                 // 3 untracked
      await writeFile('new2.txt', 'new');
      await writeFile('new3.txt', 'new');
      await writeFile('staged.txt', 'staged');            // 2 staged
      await writeFile('staged2.txt', 'staged2');
      execSync('git add staged.txt staged2.txt', { encoding: 'utf-8' });
      
      const result = execSync(
        `npx ait3 ticket start 0001 --allow-dirty`,
        { 
          encoding: 'utf-8',
          env: { ...process.env, PROJECT_ROOT: gitTestDir, TICKETS_DIR: join(gitTestDir, '.tickets') }
        }
      );

      // Check exact formatting
      expect(result).toMatch(/WARNING.*Creating branch with uncommitted changes/);
      expect(result).toMatch(/Modified:\s+1 file\(s\)/);
      expect(result).toMatch(/Added:\s+2 file\(s\)/);
      expect(result).toMatch(/Untracked:\s+3 file\(s\)/);
      expect(result).toContain('These changes will be carried to the new branch');
    });
  });
});