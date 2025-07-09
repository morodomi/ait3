import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, access, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Import the function that doesn't exist yet - this will make tests fail
import { installClaudeMdCommand } from './claude-md.js';

describe('installClaudeMdCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-install-claude-md-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic template generation', () => {
    it('should generate basic CLAUDE.md template', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('CLAUDE.md template generated');
      expect(result.message).toContain('src/assets/templates/claude-md-template.md');
      
      // Check template file was created
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      await expect(access(templatePath)).resolves.toBeUndefined();
      
      // Check basic template content
      const content = await readFile(templatePath, 'utf-8');
      expect(content).toContain('# Project: [PROJECT_NAME]');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Architecture');
      expect(content).toContain('## Key Commands');
    });

    it('should create src/assets/templates directory if it does not exist', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created directory');
      expect(result.message).toContain('src/assets/templates');
    });

    it('should include AIT³ workflow in template', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      const content = await readFile(templatePath, 'utf-8');
      
      expect(content).toContain('AIT³ Development Workflow');
      expect(content).toContain('PLANNING → RED → GREEN → REFACTOR → SQUASH');
      expect(content).toContain('ait3 flow plan');
      expect(content).toContain('ait3 ticket create');
    });

    it('should include Claude Code actions template', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      const content = await readFile(templatePath, 'utf-8');
      
      expect(content).toContain('## Development Commands');
      expect(content).toContain('[BUILD_COMMAND]');
      expect(content).toContain('[TEST_COMMAND]');
      expect(content).toContain('[DEV_COMMAND]');
    });

    it('should include placeholder sections for customization', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      const content = await readFile(templatePath, 'utf-8');
      
      expect(content).toContain('[PROJECT_NAME]');
      expect(content).toContain('[DESCRIPTION]');
      expect(content).toContain('[FRAMEWORK]');
      expect(content).toContain('[LANGUAGE]');
      expect(content).toContain('[ARCHITECTURE_PATTERN]');
    });
  });

  describe('force overwrite', () => {
    it('should warn about existing template file', async () => {
      // Create existing file
      await mkdir(join(testDir, 'src/assets/templates'), { recursive: true });
      await writeFile(join(testDir, 'src/assets/templates/claude-md-template.md'), 'existing content');
      
      const args = { force: false };
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
      expect(result.message).toContain('--force');
    });

    it('should overwrite existing file with force flag', async () => {
      // Create existing file
      await mkdir(join(testDir, 'src/assets/templates'), { recursive: true });
      await writeFile(join(testDir, 'src/assets/templates/claude-md-template.md'), 'old content');
      
      const args = { force: true };
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Overwriting existing file');
      
      // Check new content
      const content = await readFile(join(testDir, 'src/assets/templates/claude-md-template.md'), 'utf-8');
      expect(content).toContain('# Project: [PROJECT_NAME]');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Make directory read-only
      await mkdir('src', { mode: 0o444 });
      
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });
  });

  describe('next actions', () => {
    it('should provide clear next action instructions', async () => {
      const args = {};
      
      const result = await installClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Next Action');
      expect(result.message).toContain('Edit the template');
      expect(result.message).toContain('src/assets/templates/claude-md-template.md');
      expect(result.message).toContain('ait3 init claude-md');
    });
  });
});

import { writeFile } from 'fs/promises';