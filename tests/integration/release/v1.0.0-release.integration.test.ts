import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('v1.0.0 Release Preparation', () => {
  
  describe('package.json validation', () => {
    it('should have correct version 1.0.0', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.version).toBe('1.0.0');
    });

    it('should have repository field configured', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.repository).toBeDefined();
      expect(packageJson.repository).toContain('github.com');
      expect(packageJson.repository).toContain('ait3');
    });

    it('should have files field configured for npm distribution', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.files).toBeDefined();
      expect(packageJson.files).toContain('dist/');
      expect(packageJson.files).toContain('bin/');
    });

    it('should have prepublish script configured', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.scripts.prepublish || packageJson.scripts.prepublishOnly).toBeDefined();
    });

    it('should have proper keywords for discoverability', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.keywords).toContain('ai');
      expect(packageJson.keywords).toContain('claude');
      expect(packageJson.keywords).toContain('workflow');
    });
  });

  describe('documentation files', () => {
    it('should have CHANGELOG.md with v1.0.0 entry', async () => {
      await expect(access('CHANGELOG.md')).resolves.not.toThrow();
      const changelog = await readFile('CHANGELOG.md', 'utf-8');
      expect(changelog).toContain('# Changelog');
      expect(changelog).toContain('## [1.0.0]');
      expect(changelog).toContain('AIT³');
      expect(changelog).toContain('Socratic dialogue');
    });

    it('should have updated README.md with comprehensive content', async () => {
      await expect(access('README.md')).resolves.not.toThrow();
      const readme = await readFile('README.md', 'utf-8');
      expect(readme).toContain('# AIT³');
      expect(readme).toContain('AI + Ticket + Test + Tool');
      expect(readme).toContain('## Quick Start');
      expect(readme).toContain('### Installation');
      expect(readme).toContain('ait3 ticket create');
      expect(readme).toContain('ait3 flow');
    });

    it('should have README.md with Claude Code integration instructions', async () => {
      const readme = await readFile('README.md', 'utf-8');
      expect(readme).toContain('Claude Code');
      expect(readme).toContain('ait3 install');
      expect(readme).toContain('.claude/commands');
    });

    it('should have README.md with AIT³ workflow documentation', async () => {
      const readme = await readFile('README.md', 'utf-8');
      expect(readme).toContain('PLANNING');
      expect(readme).toContain('RED');
      expect(readme).toContain('GREEN');
      expect(readme).toContain('REFACTOR');
      expect(readme).toContain('SQUASH');
    });
  });

  describe('build and distribution', () => {
    it('should have .npmignore configured to exclude development files', async () => {
      await expect(access('.npmignore')).resolves.not.toThrow();
      const npmignore = await readFile('.npmignore', 'utf-8');
      expect(npmignore).toContain('src/');
      expect(npmignore).toContain('tests/');
      expect(npmignore).toContain('.tickets/');
      expect(npmignore).toContain('eslint.config.js');
      expect(npmignore).toContain('vitest.config.ts');
    });

    it('should build successfully without errors', async () => {
      const { stdout, stderr } = await execAsync('npm run build');
      expect(stderr).toBe('');
      // Verify dist directory exists and contains compiled files
      await expect(access('dist')).resolves.not.toThrow();
      await expect(access('dist/cli.js')).resolves.not.toThrow();
    });

    it('should have test infrastructure properly configured', async () => {
      // Check test configuration instead of running tests recursively
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.scripts.test).toBe('vitest run');
      
      // Check vitest config exists
      await expect(access('vitest.config.ts')).resolves.not.toThrow();
      
      // Check test directories exist
      await expect(access('tests/')).resolves.not.toThrow();
      await expect(access('src/')).resolves.not.toThrow();
    });

    it('should have TypeScript properly configured', async () => {
      // Check TypeScript configuration instead of running type-check
      await expect(access('tsconfig.json')).resolves.not.toThrow();
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.scripts['type-check']).toBe('tsc --noEmit');
    });

    it('should have lint infrastructure configured', async () => {
      // Check lint configuration instead of running lint
      await expect(access('eslint.config.js')).resolves.not.toThrow();
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.devDependencies.eslint).toBeDefined();
    });
  });

  describe('git and versioning', () => {
    it('should be ready for git tag v1.0.0', async () => {
      // Check if we can create the tag (dry run)
      const { stdout } = await execAsync('git status --porcelain');
      // Should have no uncommitted changes for clean release
      expect(stdout.trim()).toBe('');
    });

    it('should have proper commit history for release', async () => {
      const { stdout } = await execAsync('git log --oneline -n 5');
      expect(stdout).toContain('feat(#0034)'); // Should have the release preparation commits
    });
  });

  describe('package validation for npm publish', () => {
    it('should have all required npm package fields', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      expect(packageJson.name).toBe('@morodomi/ait3');
      expect(packageJson.description).toBeDefined();
      expect(packageJson.description).toContain('AIT³');
      expect(packageJson.author).toBeDefined();
      expect(packageJson.license).toBe('MIT');
      expect(packageJson.main).toBeDefined();
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.ait3).toBeDefined();
    });

    it('should have proper directory structure for distribution', async () => {
      // Essential files that should exist for npm package
      await expect(access('package.json')).resolves.not.toThrow();
      await expect(access('README.md')).resolves.not.toThrow();
      await expect(access('CHANGELOG.md')).resolves.not.toThrow();
      await expect(access('bin/ait3.js')).resolves.not.toThrow();
      
      // dist directory should exist (built separately)
      await expect(access('dist/')).resolves.not.toThrow();
    });
  });

  describe('quality gates for release', () => {
    it('should have package.json configured for quality gates', async () => {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      // Check that quality scripts exist
      expect(packageJson.scripts.test).toBe('vitest run');
      expect(packageJson.scripts['type-check']).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.ci).toBeDefined();
    });

    it('should have vitest configured for run mode by default', async () => {
      // Check vitest.config.ts has watch: false
      const vitestConfig = await readFile('vitest.config.ts', 'utf-8');
      expect(vitestConfig).toContain('watch: false');
    });
  });
});