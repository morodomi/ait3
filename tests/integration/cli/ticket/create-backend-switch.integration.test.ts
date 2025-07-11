import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('ticket create backend switching', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-backend-switch-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Save original working directory
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Create initial .tickets directory
    await mkdir(join(testDir, '.tickets'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it('should use LocalTicketService when backend is local', async () => {
    // Create config with local backend
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'local',
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 1 }
      })
    );

    // Run ticket create
    const result = execSync(
      `node ${join(originalCwd, 'bin/ait3.js')} ticket create "Test ticket"`,
      { encoding: 'utf-8' }
    );

    expect(result).toContain('SUCCESS: Ticket created successfully');
    expect(result).toContain('LOCATION: .tickets/todo/0001-test-ticket.md');
    
    // Verify local file was created
    const files = await readFile(join(testDir, '.tickets/todo/0001-test-ticket.md'), 'utf-8');
    expect(files).toContain('Test ticket');
  });

  it('should use GitHubTicketService when backend is github', async () => {
    // Create config with github backend
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'github',
        github: {
          owner: 'testowner',
          repo: 'testrepo',
          useGhCli: false
        },
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 1 }
      })
    );

    // Set a fake token to avoid auth issues
    process.env.GITHUB_TOKEN = 'fake-token';

    try {
      // This should fail because we're using a fake token
      execSync(
        `node ${join(originalCwd, 'bin/ait3.js')} ticket create "Test GitHub ticket"`,
        { encoding: 'utf-8' }
      );
      
      // Should not reach here
      expect.fail('Should have failed with GitHub API error');
    } catch (error: any) {
      // Should fail with API error, not create local file
      expect(error.message).not.toContain('Location: .tickets/todo');
      
      // Verify no local file was created
      try {
        await readFile(join(testDir, '.tickets/todo/0001-test-github-ticket.md'), 'utf-8');
        expect.fail('Local file should not exist');
      } catch {
        // Expected - file should not exist
      }
    }
  });

  it('should switch backends when config changes', async () => {
    // Start with local backend
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'local',
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 1 }
      })
    );

    // Create a ticket locally
    execSync(
      `node ${join(originalCwd, 'bin/ait3.js')} ticket create "Local ticket"`,
      { encoding: 'utf-8' }
    );

    // Change to github backend
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'github',
        github: {
          owner: 'testowner',
          repo: 'testrepo',
          useGhCli: false
        },
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 2 }
      })
    );

    process.env.GITHUB_TOKEN = 'fake-token';

    try {
      // Next command should use GitHub backend
      execSync(
        `node ${join(originalCwd, 'bin/ait3.js')} ticket create "GitHub ticket"`,
        { encoding: 'utf-8' }
      );
      
      expect.fail('Should have failed with GitHub API error');
    } catch (error: any) {
      // Should fail with API error
      expect(error.message).not.toContain('Location: .tickets/todo/0002');
    }
  });
});