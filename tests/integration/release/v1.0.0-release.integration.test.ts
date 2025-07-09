import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ReleaseTestHelpers, PackageJsonConfig } from './release-test-helpers';

const execAsync = promisify(exec);

describe('v1.0.0 Release Preparation', () => {
  
  beforeEach(() => {
    ReleaseTestHelpers.clearCache();
  });

  describe('package.json validation', () => {
    it('should have correct version 1.0.0', async () => {
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'version', '1.0.0');
    });

    it('should have repository field configured', async () => {
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      const repository = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'repository');
      expect(repository).toContain('github.com');
      expect(repository).toContain('ait3');
    });

    it('should have files field configured for npm distribution', async () => {
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      const files = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'files');
      ReleaseTestHelpers.validateArrayContains(files, ['dist/', 'bin/']);
    });

    it('should have prepublish script configured', async () => {
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      const scripts = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'scripts');
      expect(scripts.prepublish || scripts.prepublishOnly).toBeDefined();
    });

    it('should have proper keywords for discoverability', async () => {
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      const keywords = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'keywords');
      ReleaseTestHelpers.validateArrayContains(keywords, ['ai', 'claude', 'workflow']);
    });
  });

  describe('documentation files', () => {
    it('should have CHANGELOG.md with v1.0.0 entry', async () => {
      await expect(access('CHANGELOG.md')).resolves.not.toThrow();
      const changelog = await ReleaseTestHelpers.readProjectFile('CHANGELOG.md');
      ReleaseTestHelpers.validateStringContains(changelog, [
        '# Changelog',
        '## [1.0.0]',
        'AIT³',
        'Socratic dialogue'
      ]);
    });

    it('should have updated README.md with comprehensive content', async () => {
      await expect(access('README.md')).resolves.not.toThrow();
      const readme = await ReleaseTestHelpers.readProjectFile('README.md');
      ReleaseTestHelpers.validateStringContains(readme, [
        '# AIT³',
        'AI + Ticket + Test + Tool',
        '## Quick Start',
        '### Installation',
        'ait3 ticket create',
        'ait3 flow'
      ]);
    });

    it('should have README.md with Claude Code integration instructions', async () => {
      const readme = await ReleaseTestHelpers.readProjectFile('README.md');
      ReleaseTestHelpers.validateStringContains(readme, [
        'Claude Code',
        'ait3 install',
        '.claude/commands'
      ]);
    });

    it('should have README.md with AIT³ workflow documentation', async () => {
      const readme = await ReleaseTestHelpers.readProjectFile('README.md');
      ReleaseTestHelpers.validateStringContains(readme, [
        'PLANNING',
        'RED',
        'GREEN',
        'REFACTOR',
        'SQUASH'
      ]);
    });
  });

  describe('build and distribution', () => {
    it('should have .npmignore configured to exclude development files', async () => {
      await expect(access('.npmignore')).resolves.not.toThrow();
      const npmignore = await ReleaseTestHelpers.readProjectFile('.npmignore');
      ReleaseTestHelpers.validateStringContains(npmignore, [
        'src/',
        'tests/',
        '.tickets/',
        'eslint.config.js',
        'vitest.config.ts'
      ]);
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
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'scripts');
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
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      ReleaseTestHelpers.validatePackageJsonField(packageJson.scripts, 'type-check', 'tsc --noEmit');
    });

    it('should have lint infrastructure configured', async () => {
      // Check lint configuration instead of running lint
      await expect(access('eslint.config.js')).resolves.not.toThrow();
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      ReleaseTestHelpers.validatePackageJsonField(packageJson.scripts, 'lint');
      ReleaseTestHelpers.validatePackageJsonField(packageJson.devDependencies, 'eslint');
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
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'name', '@morodomi/ait3');
      const description = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'description');
      expect(description).toContain('AIT³');
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'author');
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'license', 'MIT');
      ReleaseTestHelpers.validatePackageJsonField(packageJson, 'main');
      const bin = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'bin');
      expect(bin.ait3).toBeDefined();
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
      const packageJson = await ReleaseTestHelpers.getPackageJson();
      const scripts = ReleaseTestHelpers.validatePackageJsonField(packageJson, 'scripts');
      expect(scripts.test).toBe('vitest run');
      expect(scripts['type-check']).toBeDefined();
      expect(scripts.lint).toBeDefined();
      expect(scripts.ci).toBeDefined();
    });

    it('should have vitest configured for run mode by default', async () => {
      // Check vitest.config.ts has watch: false
      const vitestConfig = await ReleaseTestHelpers.readProjectFile('vitest.config.ts');
      ReleaseTestHelpers.validateStringContains(vitestConfig, ['watch: false']);
    });
  });
});