import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, access, readFile, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Import the function that doesn't exist yet - this will make tests fail
import { initClaudeMdCommand } from './claude-md.js';

describe('initClaudeMdCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-init-claude-md-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('project analysis', () => {
    it('should detect Node.js TypeScript project', async () => {
      // Create package.json
      await writeFile('package.json', JSON.stringify({
        name: 'test-project',
        scripts: {
          test: 'npm run test',
          build: 'npm run build',
          dev: 'npm run dev'
        },
        devDependencies: {
          typescript: '^5.0.0'
        }
      }));
      
      // Create tsconfig.json
      await writeFile('tsconfig.json', JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext'
        }
      }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Node.js TypeScript project detected');
      expect(result.message).toContain('npm test');
      expect(result.message).toContain('npm run build');
    });

    it('should detect PHP Composer project', async () => {
      // Create composer.json
      await writeFile('composer.json', JSON.stringify({
        name: 'test/php-project',
        scripts: {
          test: 'phpunit',
          build: 'composer dump-autoload'
        },
        require: {
          'php': '^8.0'
        }
      }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('PHP Composer project detected');
      expect(result.message).toContain('composer test');
      expect(result.message).toContain('composer install');
    });

    it('should detect Python project with requirements.txt', async () => {
      // Create requirements.txt
      await writeFile('requirements.txt', 'fastapi==0.68.0\npytest==6.2.4');
      
      // Create setup.py
      await writeFile('setup.py', 'from setuptools import setup\nsetup(name="test-project")');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Python project detected');
      expect(result.message).toContain('pip install');
      expect(result.message).toContain('pytest');
    });

    it('should detect Python project with pyproject.toml', async () => {
      // Create pyproject.toml
      await writeFile('pyproject.toml', `
[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"

[tool.poetry]
name = "test-project"
version = "0.1.0"
`);
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Python project detected');
      expect(result.message).toContain('poetry install');
    });

    it('should detect Go project', async () => {
      // Create go.mod
      await writeFile('go.mod', 'module test-project\n\ngo 1.19');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Go project detected');
      expect(result.message).toContain('go mod tidy');
      expect(result.message).toContain('go test');
      expect(result.message).toContain('go build');
    });
  });

  describe('Docker detection', () => {
    it('should detect Dockerfile', async () => {
      await writeFile('Dockerfile', 'FROM node:18\nWORKDIR /app');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Docker detected');
      expect(result.message).toContain('Dockerfile');
    });

    it('should detect old docker-compose.yml', async () => {
      await writeFile('docker-compose.yml', 'version: "3.8"\nservices:\n  app:\n    build: .');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Docker Compose detected');
      expect(result.message).toContain('docker-compose.yml');
    });

    it('should detect new compose.yml', async () => {
      await writeFile('compose.yml', 'services:\n  app:\n    build: .');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Docker Compose detected');
      expect(result.message).toContain('compose.yml');
    });

    it('should detect new compose.yaml', async () => {
      await writeFile('compose.yaml', 'services:\n  app:\n    build: .');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Docker Compose detected');
      expect(result.message).toContain('compose.yaml');
    });
  });

  describe('template generation', () => {
    it('should generate claude-md template file', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      // Check template file was created
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      await expect(access(templatePath)).resolves.toBeUndefined();
      
      // Check template content
      const content = await readFile(templatePath, 'utf-8');
      expect(content).toContain('# Project: test-project');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Architecture');
      expect(content).toContain('## Key Commands');
      expect(content).toContain('## Development Workflow');
    });

    it('should generate project analysis file', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      // Check analysis file was created
      const analysisPath = join(testDir, 'docs/references/project-analysis.md');
      await expect(access(analysisPath)).resolves.toBeUndefined();
      
      // Check analysis content
      const content = await readFile(analysisPath, 'utf-8');
      expect(content).toContain('# Project Analysis Results');
      expect(content).toContain('## Detected Language');
      expect(content).toContain('## Build System');
      expect(content).toContain('## Commands');
    });

    it('should generate detected commands file', async () => {
      await writeFile('package.json', JSON.stringify({ 
        name: 'test-project',
        scripts: {
          test: 'vitest',
          build: 'tsc',
          dev: 'node --watch'
        }
      }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      // Check commands file was created
      const commandsPath = join(testDir, 'docs/references/detected-commands.md');
      await expect(access(commandsPath)).resolves.toBeUndefined();
      
      // Check commands content
      const content = await readFile(commandsPath, 'utf-8');
      expect(content).toContain('# Detected Commands');
      expect(content).toContain('npm test');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm run dev');
    });

    it('should create output directories if they do not exist', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created directory');
      expect(result.message).toContain('src/assets/templates');
      expect(result.message).toContain('docs/references');
    });
  });

  describe('architecture detection', () => {
    it('should detect Pure Functions + Service Injection pattern', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      // Create typical AIT³ project structure
      await mkdir('src/commands', { recursive: true });
      await mkdir('src/services', { recursive: true });
      await mkdir('src/common', { recursive: true });
      
      await writeFile('src/commands/test.ts', `
        export function testCommand(args: any, services: Services): CLIResult {
          return { success: true, message: 'test' };
        }
      `);
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Pure Functions + Service Injection');
      expect(result.message).toContain('AIT³ architecture detected');
    });

    it('should detect test framework from package.json', async () => {
      await writeFile('package.json', JSON.stringify({ 
        name: 'test-project',
        devDependencies: {
          vitest: '^1.0.0',
          '@vitest/ui': '^1.0.0'
        }
      }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Vitest test framework detected');
    });
  });

  describe('error handling', () => {
    it('should handle unknown project type', async () => {
      // No recognizable project files
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Unknown project type');
      expect(result.message).toContain('Generic template generated');
    });

    it('should handle file system errors', async () => {
      // Make directory read-only
      await mkdir('src', { mode: 0o444 });
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });

    it('should handle malformed package.json', async () => {
      await writeFile('package.json', 'invalid json');
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Malformed package.json');
      expect(result.message).toContain('Generic template generated');
    });
  });

  describe('CLAUDE.md generation', () => {
    it('should generate CLAUDE.md directly when it does not exist', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created CLAUDE.md');
      expect(result.message).toContain('Created CLAUDE_MD_GUIDE.md');
      expect(result.message).toContain('Review and customize CLAUDE.md with Claude Code');
      
      // Check CLAUDE.md was created
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await expect(access(claudeMdPath)).resolves.toBeUndefined();
      
      // Check guide was created
      const guidePath = join(testDir, 'CLAUDE_MD_GUIDE.md');
      await expect(access(guidePath)).resolves.toBeUndefined();
      
      const guideContent = await readFile(guidePath, 'utf-8');
      expect(guideContent).toContain('CLAUDE.md Customization Guide');
      expect(guideContent).toContain('analyze this project more deeply');
    });

    it('should create merge files when CLAUDE.md already exists', async () => {
      // Create existing CLAUDE.md
      await writeFile('CLAUDE.md', '# Existing CLAUDE.md\n\nThis is the existing content.');
      
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Existing CLAUDE.md detected');
      expect(result.message).toContain('Created CLAUDE.md.existing (backup)');
      expect(result.message).toContain('Created CLAUDE.md.new (new template)');
      expect(result.message).toContain('Created CLAUDE_MD_MERGE_GUIDE.md');
      expect(result.message).toContain('Review the files and merge them with Claude Code');
      
      // Check all files were created
      await expect(access(join(testDir, 'CLAUDE.md.existing'))).resolves.toBeUndefined();
      await expect(access(join(testDir, 'CLAUDE.md.new'))).resolves.toBeUndefined();
      await expect(access(join(testDir, 'CLAUDE_MD_MERGE_GUIDE.md'))).resolves.toBeUndefined();
      
      // Check merge guide content
      const mergeGuide = await readFile(join(testDir, 'CLAUDE_MD_MERGE_GUIDE.md'), 'utf-8');
      expect(mergeGuide).toContain('CLAUDE.md Merge Instructions');
      expect(mergeGuide).toContain('merge CLAUDE.md.existing and CLAUDE.md.new');
      
      // Check existing content was preserved
      const existingBackup = await readFile(join(testDir, 'CLAUDE.md.existing'), 'utf-8');
      expect(existingBackup).toContain('Existing CLAUDE.md');
      expect(existingBackup).toContain('This is the existing content');
    });
  });

  describe('AIT³ integration', () => {
    it('should include AIT³ workflow in template', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      const content = await readFile(templatePath, 'utf-8');
      
      expect(content).toContain('AIT³ Development Workflow');
      expect(content).toContain('PLANNING → RED → GREEN → REFACTOR → SQUASH');
      expect(content).toContain('ait3 flow plan');
      expect(content).toContain('ait3 flow red');
      expect(content).toContain('ait3 flow green');
      expect(content).toContain('ait3 flow refactor');
      expect(content).toContain('ait3 flow squash');
    });

    it('should include Claude Code actions in template', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const args = {};
      
      const result = await initClaudeMdCommand(args);
      
      expect(result.success).toBe(true);
      
      const templatePath = join(testDir, 'src/assets/templates/claude-md-template.md');
      const content = await readFile(templatePath, 'utf-8');
      
      expect(content).toContain('Claude Code Actions');
      expect(content).toContain('Development Commands');
      expect(content).toContain('Testing Commands');
      expect(content).toContain('Build Commands');
    });
  });
});