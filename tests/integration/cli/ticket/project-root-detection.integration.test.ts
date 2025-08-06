import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, access, readFile, readdir, symlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';

describe('Project Root Detection Integration', () => {
  let projectDir: string;
  let originalCwd: string;
  const cliPath = join(process.cwd(), 'dist', 'cli.js');

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-root-detection-${hash}-`);
    projectDir = await mkdtemp(prefix);
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
  });

  function runCommand(command: string, cwd: string): string {
    try {
      return execSync(`node ${cliPath} ${command}`, {
        cwd,
        encoding: 'utf-8',
        env: { ...process.env, TICKETS_DIR: undefined }
      });
    } catch (error: any) {
      throw new Error(`Command failed: ${error.message}\nOutput: ${error.stdout}\nError: ${error.stderr}`);
    }
  }

  it('should use root .tickets when running from subdirectory', async () => {
    // Setup: Create project structure
    process.chdir(projectDir);
    
    // Initialize tickets in project root
    runCommand('ticket create "Test ticket"', projectDir);
    
    // Verify .tickets was created in root
    await expect(access(join(projectDir, '.tickets'))).resolves.not.toThrow();
    
    // Create deep subdirectory
    const subDir = join(projectDir, 'src', 'components', 'ui');
    await mkdir(subDir, { recursive: true });
    
    // Run command from subdirectory
    runCommand('ticket list', subDir);
    
    // Verify no nested .tickets was created
    await expect(access(join(subDir, '.tickets'))).rejects.toThrow();
    await expect(access(join(projectDir, 'src', '.tickets'))).rejects.toThrow();
    await expect(access(join(projectDir, 'src', 'components', '.tickets'))).rejects.toThrow();
  });

  it('should create tickets in root when running from subdirectory', async () => {
    // Setup: Create project with existing .tickets
    process.chdir(projectDir);
    runCommand('ticket create "First ticket"', projectDir);
    
    // Create subdirectory
    const subDir = join(projectDir, 'src', 'services');
    await mkdir(subDir, { recursive: true });
    
    // Create ticket from subdirectory
    runCommand('ticket create "Second ticket"', subDir);
    
    // Both tickets should be in root .tickets
    const listOutput = runCommand('ticket list', subDir);
    expect(listOutput).toContain('First ticket');
    expect(listOutput).toContain('Second ticket');
    
    // Verify tickets are in root directory
    const ticketsDir = join(projectDir, '.tickets', 'todo');
    const files = await readdir(ticketsDir);
    expect(files).toHaveLength(2);
  });

  it('should find .git directory when no .tickets exists', async () => {
    // Create git repository
    process.chdir(projectDir);
    execSync('git init', { cwd: projectDir });
    
    // Create subdirectory
    const subDir = join(projectDir, 'src', 'utils');
    await mkdir(subDir, { recursive: true });
    
    // Run command from subdirectory (should create .tickets at git root)
    runCommand('ticket create "Git root ticket"', subDir);
    
    // Verify .tickets was created at git root
    await expect(access(join(projectDir, '.tickets'))).resolves.not.toThrow();
    await expect(access(join(subDir, '.tickets'))).rejects.toThrow();
  });

  it('should handle nested git repositories correctly', async () => {
    // Create main project with .tickets
    process.chdir(projectDir);
    runCommand('ticket create "Main project ticket"', projectDir);
    
    // Create submodule with its own git
    const submoduleDir = join(projectDir, 'external', 'submodule');
    await mkdir(submoduleDir, { recursive: true });
    execSync('git init', { cwd: submoduleDir });
    
    // Run from submodule - should still use root .tickets
    runCommand('ticket list', submoduleDir);
    
    // Verify no .tickets in submodule
    await expect(access(join(submoduleDir, '.tickets'))).rejects.toThrow();
    
    // Verify ticket list shows main project ticket
    const output = runCommand('ticket list', submoduleDir);
    expect(output).toContain('Main project ticket');
  });

  it('should create .tickets in current directory when no root markers found', async () => {
    // Create isolated directory (no .git, no parent .tickets)
    const isolatedDir = join(projectDir, 'isolated');
    await mkdir(isolatedDir, { recursive: true });
    
    // Run command in isolated directory
    runCommand('ticket create "Isolated ticket"', isolatedDir);
    
    // Should create .tickets in current directory
    await expect(access(join(isolatedDir, '.tickets'))).resolves.not.toThrow();
    await expect(access(join(projectDir, '.tickets'))).rejects.toThrow();
  });

  it('should respect TICKETS_DIR environment variable', async () => {
    // Create custom tickets directory
    const customTicketsDir = join(projectDir, 'my-tickets');
    await mkdir(customTicketsDir, { recursive: true });
    
    // Create subdirectory
    const subDir = join(projectDir, 'src');
    await mkdir(subDir, { recursive: true });
    
    // Run with TICKETS_DIR set
    execSync(`node ${cliPath} ticket create "Custom dir ticket"`, {
      cwd: subDir,
      encoding: 'utf-8',
      env: { ...process.env, TICKETS_DIR: customTicketsDir }
    });
    
    // Verify ticket was created in custom directory
    await expect(access(customTicketsDir)).resolves.not.toThrow();
    await expect(access(join(subDir, '.tickets'))).rejects.toThrow();
  });

  it('should handle symlinked directories correctly', async () => {
    // Create real project directory with .tickets
    const realDir = join(projectDir, 'real-project');
    await mkdir(realDir, { recursive: true });
    process.chdir(realDir);
    runCommand('ticket create "Real ticket"', realDir);
    
    // Create symlink to project
    const linkDir = join(projectDir, 'link-project');
    await symlink(realDir, linkDir, 'dir');
    
    // Create subdirectory in symlinked project
    const subDir = join(linkDir, 'src');
    await mkdir(subDir, { recursive: true });
    
    // Run from symlinked subdirectory
    const output = runCommand('ticket list', subDir);
    
    // Should find ticket from real project
    expect(output).toContain('Real ticket');
    
    // Should not create new .tickets
    await expect(access(join(subDir, '.tickets'))).rejects.toThrow();
  });

  it('should maintain performance with deep directory structures', async () => {
    // Create very deep directory structure
    let deepDir = projectDir;
    for (let i = 0; i < 20; i++) {
      deepDir = join(deepDir, `level${i}`);
    }
    await mkdir(deepDir, { recursive: true });
    
    // Create .tickets at root
    runCommand('ticket create "Root ticket"', projectDir);
    
    // Time the command execution from deep directory
    const startTime = Date.now();
    runCommand('ticket list', deepDir);
    const endTime = Date.now();
    
    // Should complete reasonably fast (less than 3 seconds for 20 deep directories)
    expect(endTime - startTime).toBeLessThan(3000);
  });
});