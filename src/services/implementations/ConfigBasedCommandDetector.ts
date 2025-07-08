import { cosmiconfig } from 'cosmiconfig';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import type { CommandDetector } from '../interfaces/CommandDetector.js';
import type { CommandInfo } from '../../common/types/analyzer.js';

export class ConfigBasedCommandDetector implements CommandDetector {
  constructor(private rootPath: string) {}

  async detectTestCommand(path?: string, language?: string): Promise<CommandInfo> {
    const targetPath = path || this.rootPath;

    // Try package.json first for JS/TS projects
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.scripts?.test) {
      return {
        command: 'npm test',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      };
    }

    // Language-specific detection
    if (language === 'Python' || !language) {
      // Check for pytest
      if (await this.fileExists(join(targetPath, 'pytest.ini')) ||
          await this.fileExists(join(targetPath, 'pyproject.toml'))) {
        return {
          command: 'pytest',
          detected: true,
          source: 'config-file',
          confidence: 0.9
        };
      }
      
      // Check for unittest
      if (await this.fileExists(join(targetPath, 'test_*.py')) ||
          await this.fileExists(join(targetPath, 'tests'))) {
        return {
          command: 'python -m unittest',
          detected: true,
          source: 'convention',
          confidence: 0.7
        };
      }
    }

    if (language === 'PHP' || !language) {
      // Check for PHPUnit
      if (await this.fileExists(join(targetPath, 'phpunit.xml')) ||
          await this.fileExists(join(targetPath, 'phpunit.xml.dist'))) {
        return {
          command: './vendor/bin/phpunit',
          detected: true,
          source: 'config-file',
          confidence: 0.9
        };
      }
    }

    // Default based on language
    if (language === 'TypeScript' || language === 'JavaScript') {
      return {
        command: 'npm test',
        detected: false,
        source: 'default',
        confidence: 0.3
      };
    }

    return {
      command: 'npm test',
      detected: false,
      source: 'default',
      confidence: 0.3
    };
  }

  async detectLintCommand(path?: string, language?: string): Promise<CommandInfo> {
    const targetPath = path || this.rootPath;

    // Try package.json first
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.scripts?.lint) {
      return {
        command: 'npm run lint',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      };
    }

    // Check for ESLint
    if (language === 'TypeScript' || language === 'JavaScript' || !language) {
      if (await this.fileExists(join(targetPath, '.eslintrc.js')) ||
          await this.fileExists(join(targetPath, '.eslintrc.json')) ||
          await this.fileExists(join(targetPath, '.eslintrc.yml'))) {
        return {
          command: 'npx eslint .',
          detected: true,
          source: 'config-file',
          confidence: 0.8
        };
      }
    }

    // Python linting
    if (language === 'Python' || !language) {
      // Check for ruff
      if (await this.fileExists(join(targetPath, '.ruff.toml')) ||
          await this.fileExists(join(targetPath, 'pyproject.toml'))) {
        const pyproject = await this.readPyprojectToml(targetPath);
        if (pyproject?.includes('[tool.ruff]') || await this.fileExists(join(targetPath, '.ruff.toml'))) {
          return {
            command: 'ruff check',
            detected: true,
            source: 'config-file',
            confidence: 0.9
          };
        }
      }

      // Check for flake8
      if (await this.fileExists(join(targetPath, '.flake8')) ||
          await this.fileExists(join(targetPath, 'setup.cfg'))) {
        return {
          command: 'flake8',
          detected: true,
          source: 'config-file',
          confidence: 0.8
        };
      }
    }

    // PHP linting
    if (language === 'PHP' || !language) {
      if (await this.fileExists(join(targetPath, 'phpcs.xml')) ||
          await this.fileExists(join(targetPath, 'phpcs.xml.dist'))) {
        return {
          command: './vendor/bin/phpcs',
          detected: true,
          source: 'config-file',
          confidence: 0.9
        };
      }
    }

    return {
      command: '',
      detected: false,
      source: 'not-found',
      confidence: 0
    };
  }

  async detectFormatCommand(path?: string, language?: string): Promise<CommandInfo> {
    const targetPath = path || this.rootPath;

    // Try package.json first
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.scripts?.format) {
      return {
        command: 'npm run format',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      };
    }

    // Check for Prettier
    if (language === 'TypeScript' || language === 'JavaScript' || !language) {
      if (await this.fileExists(join(targetPath, '.prettierrc')) ||
          await this.fileExists(join(targetPath, '.prettierrc.json')) ||
          await this.fileExists(join(targetPath, '.prettierrc.js'))) {
        return {
          command: 'npx prettier --write .',
          detected: true,
          source: 'config-file',
          confidence: 0.8
        };
      }
    }

    // Python formatting
    if (language === 'Python' || !language) {
      // Check for Black
      if (await this.fileExists(join(targetPath, 'pyproject.toml'))) {
        const pyproject = await this.readPyprojectToml(targetPath);
        if (pyproject?.includes('[tool.black]')) {
          return {
            command: 'black .',
            detected: true,
            source: 'config-file',
            confidence: 0.9
          };
        }
      }
    }

    // PHP formatting
    if (language === 'PHP' || !language) {
      if (await this.fileExists(join(targetPath, '.php-cs-fixer.php')) ||
          await this.fileExists(join(targetPath, '.php_cs'))) {
        return {
          command: './vendor/bin/php-cs-fixer fix',
          detected: true,
          source: 'config-file',
          confidence: 0.9
        };
      }
    }

    return {
      command: '',
      detected: false,
      source: 'not-found',
      confidence: 0
    };
  }

  async detectBuildCommand(path?: string, language?: string): Promise<CommandInfo> {
    const targetPath = path || this.rootPath;

    // Try package.json first
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.scripts?.build) {
      return {
        command: 'npm run build',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      };
    }

    // TypeScript build
    if (language === 'TypeScript' || !language) {
      if (await this.fileExists(join(targetPath, 'tsconfig.json'))) {
        return {
          command: 'npx tsc',
          detected: true,
          source: 'config-file',
          confidence: 0.7
        };
      }
    }

    // Python build
    if (language === 'Python' || !language) {
      if (await this.fileExists(join(targetPath, 'setup.py'))) {
        return {
          command: 'python setup.py build',
          detected: true,
          source: 'config-file',
          confidence: 0.7
        };
      }
    }

    // PHP build (composer)
    if (language === 'PHP' || !language) {
      if (await this.fileExists(join(targetPath, 'composer.json'))) {
        return {
          command: 'composer install --no-dev',
          detected: true,
          source: 'config-file',
          confidence: 0.6
        };
      }
    }

    return {
      command: '',
      detected: false,
      source: 'not-found',
      confidence: 0
    };
  }

  private async readPackageJson(targetPath: string): Promise<any> {
    try {
      const content = await readFile(join(targetPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async readPyprojectToml(targetPath: string): Promise<string | null> {
    try {
      return await readFile(join(targetPath, 'pyproject.toml'), 'utf-8');
    } catch {
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}