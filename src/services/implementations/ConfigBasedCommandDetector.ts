import { cosmiconfig } from 'cosmiconfig';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import type { CommandDetector } from '../interfaces/CommandDetector.js';
import type { CommandInfo } from '../../common/types/analyzer.js';

type CommandType = 'test' | 'lint' | 'format' | 'build';

interface LanguageDetector {
  [key: string]: (targetPath: string) => Promise<CommandInfo | null>;
}

export class ConfigBasedCommandDetector implements CommandDetector {
  private languageDetectors: Record<CommandType, LanguageDetector> = {
    test: {
      Python: this.detectPythonTest.bind(this),
      PHP: this.detectPHPTest.bind(this)
    },
    lint: {
      Python: this.detectPythonLint.bind(this),
      PHP: this.detectPHPLint.bind(this),
      TypeScript: this.detectJSLint.bind(this),
      JavaScript: this.detectJSLint.bind(this)
    },
    format: {
      Python: this.detectPythonFormat.bind(this),
      PHP: this.detectPHPFormat.bind(this),
      TypeScript: this.detectJSFormat.bind(this),
      JavaScript: this.detectJSFormat.bind(this)
    },
    build: {
      Python: this.detectPythonBuild.bind(this),
      PHP: this.detectPHPBuild.bind(this),
      TypeScript: this.detectTSBuild.bind(this)
    }
  };

  constructor(private rootPath: string) {}

  async detectTestCommand(path?: string, language?: string): Promise<CommandInfo> {
    return this.detectCommand('test', path, language, 'npm test');
  }

  async detectLintCommand(path?: string, language?: string): Promise<CommandInfo> {
    return this.detectCommand('lint', path, language, '');
  }

  async detectFormatCommand(path?: string, language?: string): Promise<CommandInfo> {
    return this.detectCommand('format', path, language, '');
  }

  async detectBuildCommand(path?: string, language?: string): Promise<CommandInfo> {
    return this.detectCommand('build', path, language, '');
  }

  private async detectCommand(
    type: CommandType,
    path?: string,
    language?: string,
    defaultCommand?: string
  ): Promise<CommandInfo> {
    const targetPath = path || this.rootPath;

    // Try package.json first for JS/TS projects
    const packageCommand = await this.detectPackageJsonCommand(targetPath, type);
    if (packageCommand) return packageCommand;

    // Try language-specific detection
    if (language && this.languageDetectors[type][language]) {
      const result = await this.languageDetectors[type][language](targetPath);
      if (result) return result;
    }

    // Try all language detectors if no language specified
    if (!language) {
      for (const detector of Object.values(this.languageDetectors[type])) {
        const result = await detector(targetPath);
        if (result) return result;
      }
    }

    // Return default or not found
    if (defaultCommand) {
      return {
        command: defaultCommand,
        detected: false,
        source: 'default',
        confidence: 0.3
      };
    }

    return {
      command: '',
      detected: false,
      source: 'not-found',
      confidence: 0
    };
  }

  private async detectPackageJsonCommand(
    targetPath: string, 
    type: CommandType
  ): Promise<CommandInfo | null> {
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.scripts?.[type]) {
      return {
        command: `npm ${type === 'test' ? 'test' : `run ${type}`}`,
        detected: true,
        source: 'package.json',
        confidence: 1.0
      };
    }
    return null;
  }

  // Python detection methods
  private async detectPythonTest(targetPath: string): Promise<CommandInfo | null> {
    const [hasPytest, hasPyproject, hasTests] = await Promise.all([
      this.fileExists(join(targetPath, 'pytest.ini')),
      this.fileExists(join(targetPath, 'pyproject.toml')),
      this.fileExists(join(targetPath, 'tests'))
    ]);

    if (hasPytest || hasPyproject) {
      return {
        command: 'pytest',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }

    if (hasTests) {
      return {
        command: 'python -m unittest',
        detected: true,
        source: 'convention',
        confidence: 0.7
      };
    }

    return null;
  }

  private async detectPythonLint(targetPath: string): Promise<CommandInfo | null> {
    const [hasRuff, hasPyproject] = await Promise.all([
      this.fileExists(join(targetPath, '.ruff.toml')),
      this.readPyprojectToml(targetPath)
    ]);

    if (hasRuff || hasPyproject?.includes('[tool.ruff]')) {
      return {
        command: 'ruff check',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }

    if (await this.fileExists(join(targetPath, '.flake8'))) {
      return {
        command: 'flake8',
        detected: true,
        source: 'config-file',
        confidence: 0.8
      };
    }

    return null;
  }

  private async detectPythonFormat(targetPath: string): Promise<CommandInfo | null> {
    const pyproject = await this.readPyprojectToml(targetPath);
    if (pyproject?.includes('[tool.black]')) {
      return {
        command: 'black .',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }
    return null;
  }

  private async detectPythonBuild(targetPath: string): Promise<CommandInfo | null> {
    if (await this.fileExists(join(targetPath, 'setup.py'))) {
      return {
        command: 'python setup.py build',
        detected: true,
        source: 'config-file',
        confidence: 0.7
      };
    }
    return null;
  }

  // PHP detection methods
  private async detectPHPTest(targetPath: string): Promise<CommandInfo | null> {
    const [hasPhpUnit, hasPhpUnitDist] = await Promise.all([
      this.fileExists(join(targetPath, 'phpunit.xml')),
      this.fileExists(join(targetPath, 'phpunit.xml.dist'))
    ]);

    if (hasPhpUnit || hasPhpUnitDist) {
      return {
        command: './vendor/bin/phpunit',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }
    return null;
  }

  private async detectPHPLint(targetPath: string): Promise<CommandInfo | null> {
    const [hasPhpCs, hasPhpCsDist] = await Promise.all([
      this.fileExists(join(targetPath, 'phpcs.xml')),
      this.fileExists(join(targetPath, 'phpcs.xml.dist'))
    ]);

    if (hasPhpCs || hasPhpCsDist) {
      return {
        command: './vendor/bin/phpcs',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }
    return null;
  }

  private async detectPHPFormat(targetPath: string): Promise<CommandInfo | null> {
    const [hasPhpCsFixer, hasLegacyFixer] = await Promise.all([
      this.fileExists(join(targetPath, '.php-cs-fixer.php')),
      this.fileExists(join(targetPath, '.php_cs'))
    ]);

    if (hasPhpCsFixer || hasLegacyFixer) {
      return {
        command: './vendor/bin/php-cs-fixer fix',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      };
    }
    return null;
  }

  private async detectPHPBuild(targetPath: string): Promise<CommandInfo | null> {
    if (await this.fileExists(join(targetPath, 'composer.json'))) {
      return {
        command: 'composer install --no-dev',
        detected: true,
        source: 'config-file',
        confidence: 0.6
      };
    }
    return null;
  }

  // JavaScript/TypeScript detection methods
  private async detectJSLint(targetPath: string): Promise<CommandInfo | null> {
    const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml'];
    const hasEslint = await this.anyFileExists(targetPath, eslintConfigs);

    if (hasEslint) {
      return {
        command: 'npx eslint .',
        detected: true,
        source: 'config-file',
        confidence: 0.8
      };
    }
    return null;
  }

  private async detectJSFormat(targetPath: string): Promise<CommandInfo | null> {
    const prettierConfigs = ['.prettierrc', '.prettierrc.json', '.prettierrc.js'];
    const hasPrettier = await this.anyFileExists(targetPath, prettierConfigs);

    if (hasPrettier) {
      return {
        command: 'npx prettier --write .',
        detected: true,
        source: 'config-file',
        confidence: 0.8
      };
    }
    return null;
  }

  private async detectTSBuild(targetPath: string): Promise<CommandInfo | null> {
    if (await this.fileExists(join(targetPath, 'tsconfig.json'))) {
      return {
        command: 'npx tsc',
        detected: true,
        source: 'config-file',
        confidence: 0.7
      };
    }
    return null;
  }

  // Utility methods
  private async anyFileExists(basePath: string, files: string[]): Promise<boolean> {
    const checks = await Promise.all(
      files.map(file => this.fileExists(join(basePath, file)))
    );
    return checks.some(exists => exists);
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