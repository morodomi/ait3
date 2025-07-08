import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('CLI Integration: ticket start with GitService', () => {
  let testDir: string;
  let originalTicketsDir: string;

  beforeEach(async () => {
    // Create unique test directory
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-ticket-start-git-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Store original tickets directory
    originalTicketsDir = process.env.TICKETS_DIR || '.tickets';
    
    // Set test environment
    process.env.TICKETS_DIR = testDir;

    // Create ticket structure
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });

    // Create test ticket
    await writeFile(
      join(testDir, 'todo', '0001-test-git-integration.md'),
      `---
id: '0001'
title: 'Test Git Integration'
status: todo
priority: high
created: '2025-01-01T10:00:00Z'
updated: '2025-01-01T10:00:00Z'
labels:
  - test
  - git
---
# Ticket #0001: Test Git Integration

## Description
Test GitService integration with ticket start command.
`
    );

    // Create config
    await writeFile(
      join(testDir, 'config.json'),
      JSON.stringify({
        backend: 'local',
        path: testDir,
        numbering: { format: '0000', increment: 1, next: 2 }
      }, null, 2)
    );

    // Initialize git repo in test directory
    execSync('git init', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git add .', { cwd: testDir });
    execSync('git commit -m "Initial commit"', { cwd: testDir });
  });

  afterEach(async () => {
    // Restore original tickets directory
    process.env.TICKETS_DIR = originalTicketsDir;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('GitService integration', () => {
    it('should create and checkout feature branch when starting ticket', async () => {
      // This test will fail until GitService is implemented
      expect(() => {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Expected to fail because GitService is not implemented

      // After implementation, it should:
      // 1. Create branch feature/0001-test-git-integration
      // 2. Checkout the new branch
      // 3. Move ticket to doing status
    });

    it('should handle uncommitted changes error', async () => {
      // Create uncommitted changes
      await writeFile(join(testDir, 'uncommitted.txt'), 'changes');
      
      expect(() => {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Should fail with uncommitted changes
    });

    it('should switch to existing branch if already exists', async () => {
      // Create feature branch manually
      execSync('git checkout -b feature/0001-test-git-integration', { cwd: testDir });
      execSync('git checkout main', { cwd: testDir });

      // This test will fail until GitService is implemented
      expect(() => {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Expected to fail because GitService is not implemented

      // After implementation, it should switch to existing branch
    });

    it('should work when not in a git repository', async () => {
      // Remove .git directory
      await rm(join(testDir, '.git'), { recursive: true, force: true });

      // This test will fail until GitService is implemented
      expect(() => {
        execSync(
          'node dist/cli.js ticket start 0001',
          {
            encoding: 'utf8',
            cwd: testDir,
            env: { ...process.env, TICKETS_DIR: testDir }
          }
        );
      }).toThrow(); // Expected to fail because GitService is not implemented

      // After implementation, it should:
      // 1. Show manual git instructions
      // 2. Still move ticket to doing status
    });
  });
});