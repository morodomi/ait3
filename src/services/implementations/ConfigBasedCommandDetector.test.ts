import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigBasedCommandDetector } from './ConfigBasedCommandDetector.js';

// Mock cosmiconfig
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    search: vi.fn(),
    load: vi.fn()
  }))
}));

describe('ConfigBasedCommandDetector', () => {
  let testDir: string;
  let detector: ConfigBasedCommandDetector;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-command-detector-'));
    detector = new ConfigBasedCommandDetector(testDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectTestCommand', () => {
    it('should detect test command from package.json scripts', async () => {
      const packageJson = {
        scripts: {
          test: 'vitest',
          'test:watch': 'vitest --watch',
          'test:coverage': 'vitest --coverage'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const command = await detector.detectTestCommand();

      expect(command).toEqual({
        command: 'npm test',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
    });

    it('should detect test command for Python project', async () => {
      await writeFile(join(testDir, 'pytest.ini'), '[pytest]\naddopts = -v');
      await writeFile(join(testDir, 'requirements.txt'), 'pytest==7.0.0');

      const command = await detector.detectTestCommand(testDir, 'Python');

      expect(command).toEqual({
        command: 'pytest',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });

    it('should detect PHPUnit for Laravel project', async () => {
      const composerJson = {
        require: { 'laravel/framework': '^8.0' },
        'require-dev': { 'phpunit/phpunit': '^9.0' }
      };
      await writeFile(join(testDir, 'composer.json'), JSON.stringify(composerJson));
      await writeFile(join(testDir, 'phpunit.xml'), '<phpunit></phpunit>');

      const command = await detector.detectTestCommand(testDir, 'PHP');

      expect(command).toEqual({
        command: './vendor/bin/phpunit',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });

    it('should return default command when no test setup found', async () => {
      const command = await detector.detectTestCommand(testDir, 'TypeScript');

      expect(command).toEqual({
        command: 'npm test',
        detected: false,
        source: 'default',
        confidence: 0.3
      });
    });

    it('should handle missing package.json gracefully', async () => {
      const command = await detector.detectTestCommand();

      expect(command.detected).toBe(false);
      expect(command.source).toBe('default');
      expect(command.confidence).toBeLessThan(0.5);
    });
  });

  describe('detectLintCommand', () => {
    it('should detect ESLint from package.json', async () => {
      const packageJson = {
        scripts: {
          lint: 'eslint src --ext .ts,.tsx',
          'lint:fix': 'eslint src --ext .ts,.tsx --fix'
        },
        devDependencies: {
          eslint: '^8.0.0'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));
      await writeFile(join(testDir, '.eslintrc.js'), 'module.exports = {};');

      const command = await detector.detectLintCommand();

      expect(command).toEqual({
        command: 'npm run lint',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
    });

    it('should detect ruff for Python project', async () => {
      await writeFile(join(testDir, '.ruff.toml'), 'line-length = 88');
      await writeFile(join(testDir, 'requirements-dev.txt'), 'ruff==0.1.0');

      const command = await detector.detectLintCommand(testDir, 'Python');

      expect(command).toEqual({
        command: 'ruff check',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });

    it('should detect PHP CodeSniffer for PHP project', async () => {
      const composerJson = {
        'require-dev': {
          'squizlabs/php_codesniffer': '^3.0'
        }
      };
      await writeFile(join(testDir, 'composer.json'), JSON.stringify(composerJson));
      await writeFile(join(testDir, 'phpcs.xml'), '<ruleset></ruleset>');

      const command = await detector.detectLintCommand(testDir, 'PHP');

      expect(command).toEqual({
        command: './vendor/bin/phpcs',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });

    it('should return not-found when no linter detected', async () => {
      const command = await detector.detectLintCommand();

      expect(command).toEqual({
        command: '',
        detected: false,
        source: 'not-found',
        confidence: 0
      });
    });
  });

  describe('detectFormatCommand', () => {
    it('should detect Prettier from package.json', async () => {
      const packageJson = {
        scripts: {
          format: 'prettier --write "src/**/*.ts"',
          'format:check': 'prettier --check "src/**/*.ts"'
        },
        devDependencies: {
          prettier: '^2.0.0'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));
      await writeFile(join(testDir, '.prettierrc'), '{}');

      const command = await detector.detectFormatCommand();

      expect(command).toEqual({
        command: 'npm run format',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
    });

    it('should detect Black for Python project', async () => {
      await writeFile(join(testDir, 'pyproject.toml'), '[tool.black]\nline-length = 88');
      await writeFile(join(testDir, 'requirements-dev.txt'), 'black==22.0.0');

      const command = await detector.detectFormatCommand(testDir, 'Python');

      expect(command).toEqual({
        command: 'black .',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });

    it('should detect PHP CS Fixer', async () => {
      const composerJson = {
        'require-dev': {
          'friendsofphp/php-cs-fixer': '^3.0'
        }
      };
      await writeFile(join(testDir, 'composer.json'), JSON.stringify(composerJson));
      await writeFile(join(testDir, '.php-cs-fixer.php'), '<?php return [];');

      const command = await detector.detectFormatCommand(testDir, 'PHP');

      expect(command).toEqual({
        command: './vendor/bin/php-cs-fixer fix',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
    });
  });

  describe('detectBuildCommand', () => {
    it('should detect build command from package.json', async () => {
      const packageJson = {
        scripts: {
          build: 'tsc && vite build',
          'build:prod': 'NODE_ENV=production npm run build'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const command = await detector.detectBuildCommand();

      expect(command).toEqual({
        command: 'npm run build',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
    });

    it('should detect Python setup.py build', async () => {
      await writeFile(join(testDir, 'setup.py'), 'from setuptools import setup');
      
      const command = await detector.detectBuildCommand(testDir, 'Python');

      expect(command).toEqual({
        command: 'python setup.py build',
        detected: true,
        source: 'config-file',
        confidence: 0.7
      });
    });

    it('should detect composer for PHP', async () => {
      await writeFile(join(testDir, 'composer.json'), '{}');
      
      const command = await detector.detectBuildCommand(testDir, 'PHP');

      expect(command).toEqual({
        command: 'composer install --no-dev',
        detected: true,
        source: 'config-file',
        confidence: 0.6
      });
    });

    it('should return not-found when no build system detected', async () => {
      const command = await detector.detectBuildCommand();

      expect(command).toEqual({
        command: '',
        detected: false,
        source: 'not-found',
        confidence: 0
      });
    });
  });
});