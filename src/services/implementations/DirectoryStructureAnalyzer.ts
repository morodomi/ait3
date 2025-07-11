import { readdir, stat, readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import type { StructureAnalyzer } from '../interfaces/StructureAnalyzer.js';
import type { ProjectStructure, FrameworkInfo, DirectoryInfo } from '../../common/types/analyzer.js';

// Type definitions for config files
interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

interface ComposerJson {
  name?: string;
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
  [key: string]: unknown;
}

export class DirectoryStructureAnalyzer implements StructureAnalyzer {
  constructor(private rootPath: string) {}

  async analyzeStructure(path?: string): Promise<ProjectStructure> {
    const targetPath = path || this.rootPath;
    
    const directories = await this.scanDirectories(targetPath);
    const hasGitRepository = await this.checkForGit(targetPath);
    const hasCICD = await this.checkForCICD(targetPath);
    const hasDocker = await this.checkForDocker(targetPath);

    return {
      rootPath: targetPath,
      directories,
      hasGitRepository,
      hasCICD,
      hasDocker
    };
  }

  async detectFramework(path?: string, language?: string): Promise<FrameworkInfo> {
    const targetPath = path || this.rootPath;

    // TypeScript/JavaScript frameworks
    if (language === 'TypeScript' || language === 'JavaScript' || !language) {
      // Next.js
      if (await this.fileExists(join(targetPath, 'next.config.js')) ||
          await this.fileExists(join(targetPath, 'next.config.mjs'))) {
        const version = await this.getPackageVersion(targetPath, 'next');
        return {
          name: 'Next.js',
          version,
          type: 'fullstack',
          confidence: 0.95
        };
      }

      // Express
      const packageJson = await this.readPackageJson(targetPath);
      if (packageJson?.dependencies?.express) {
        return {
          name: 'Express',
          version: this.extractVersion(packageJson.dependencies.express),
          type: 'backend',
          confidence: 0.85
        };
      }

      // Check for library project
      if (packageJson?.main || packageJson?.types) {
        return {
          name: 'Node.js Library',
          version: packageJson.version,
          type: 'library',
          confidence: 0.7
        };
      }
    }

    // Python frameworks
    if (language === 'Python' || !language) {
      // Django
      if (await this.fileExists(join(targetPath, 'manage.py'))) {
        const requirementsVersion = await this.getRequirementsVersion(targetPath, 'django');
        return {
          name: 'Django',
          version: requirementsVersion || '4.2.0',
          type: 'fullstack',
          confidence: 0.95
        };
      }

      // Flask
      const requirements = await this.readRequirements(targetPath);
      if (requirements?.includes('flask')) {
        const version = await this.getRequirementsVersion(targetPath, 'flask');
        return {
          name: 'Flask',
          version: version || '2.3.0',
          type: 'backend',
          confidence: 0.9
        };
      }
    }

    // PHP frameworks
    if (language === 'PHP' || !language) {
      // Laravel
      if (await this.fileExists(join(targetPath, 'artisan'))) {
        const composerJson = await this.readComposerJson(targetPath);
        const version = this.extractVersion(composerJson?.require?.['laravel/framework']);
        return {
          name: 'Laravel',
          version: version || '10.0',
          type: 'fullstack',
          confidence: 0.95
        };
      }
    }

    return {
      name: 'Unknown',
      type: 'unknown',
      confidence: 0
    };
  }

  private async scanDirectories(targetPath: string): Promise<DirectoryInfo[]> {
    const directories: DirectoryInfo[] = [];
    
    try {
      const entries = await readdir(targetPath);
      
      for (const entry of entries) {
        const fullPath = join(targetPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !this.shouldIgnoreDirectory(entry)) {
          const fileCount = await this.countFiles(fullPath);
          const type = this.detectDirectoryType(entry);
          
          directories.push({
            path: fullPath,
            name: entry,
            type,
            fileCount
          });
        }
      }
    } catch {
      // Return empty array on error
    }
    
    return directories.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async countFiles(dir: string): Promise<number> {
    let count = 0;
    
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isFile()) {
          count++;
        } else if (stats.isDirectory() && !this.shouldIgnoreDirectory(entry)) {
          count += await this.countFiles(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
    
    return count;
  }

  private detectDirectoryType(name: string): DirectoryInfo['type'] {
    // Source directories
    if (['src', 'lib', 'app', 'source'].includes(name)) {
      return 'source';
    }
    
    // Test directories
    if (['test', 'tests', 'spec', 'specs', '__tests__'].includes(name)) {
      return 'test';
    }
    
    // Build/output directories
    if (['dist', 'build', 'out', 'public', 'target'].includes(name)) {
      return 'build';
    }
    
    // Configuration directories
    if (['config', 'configs', '.config'].includes(name)) {
      return 'config';
    }
    
    // Documentation
    if (['docs', 'doc', 'documentation'].includes(name)) {
      return 'docs';
    }
    
    return 'other';
  }

  private shouldIgnoreDirectory(name: string): boolean {
    const ignoreDirs = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'coverage',
      '.nyc_output',
      '.next',
      '__pycache__',
      '.pytest_cache',
      'vendor',
      '.venv',
      'venv',
      'env',
      '.env',
      '.idea',
      '.vscode',
      '.DS_Store'
    ];
    
    return ignoreDirs.includes(name) || name.startsWith('.');
  }

  private async checkForGit(targetPath: string): Promise<boolean> {
    return await this.fileExists(join(targetPath, '.git')) ||
           await this.fileExists(join(targetPath, '.gitignore'));
  }

  private async checkForCICD(targetPath: string): Promise<boolean> {
    return await this.fileExists(join(targetPath, '.github/workflows')) ||
           await this.fileExists(join(targetPath, '.gitlab-ci.yml')) ||
           await this.fileExists(join(targetPath, 'Jenkinsfile')) ||
           await this.fileExists(join(targetPath, '.circleci')) ||
           await this.fileExists(join(targetPath, 'azure-pipelines.yml'));
  }

  private async checkForDocker(targetPath: string): Promise<boolean> {
    return await this.fileExists(join(targetPath, 'Dockerfile')) ||
           await this.fileExists(join(targetPath, 'docker-compose.yml')) ||
           await this.fileExists(join(targetPath, 'docker-compose.yaml'));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async readPackageJson(targetPath: string): Promise<PackageJson | null> {
    try {
      const content = await readFile(join(targetPath, 'package.json'), 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  private async readComposerJson(targetPath: string): Promise<ComposerJson | null> {
    try {
      const content = await readFile(join(targetPath, 'composer.json'), 'utf-8');
      return JSON.parse(content) as ComposerJson;
    } catch {
      return null;
    }
  }

  private async readRequirements(targetPath: string): Promise<string | null> {
    try {
      return await readFile(join(targetPath, 'requirements.txt'), 'utf-8');
    } catch {
      return null;
    }
  }

  private async getPackageVersion(targetPath: string, packageName: string): Promise<string | undefined> {
    const packageJson = await this.readPackageJson(targetPath);
    if (packageJson?.dependencies?.[packageName]) {
      return this.extractVersion(packageJson.dependencies[packageName]);
    }
    return undefined;
  }

  private async getRequirementsVersion(targetPath: string, packageName: string): Promise<string | null> {
    const requirements = await this.readRequirements(targetPath);
    if (!requirements) return null;

    const lines = requirements.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().startsWith(packageName)) {
        const match = line.match(/==(.+)/);
        if (match) return match[1];
      }
    }
    return null;
  }

  private extractVersion(versionString?: string): string | undefined {
    if (!versionString) return undefined;
    
    // Remove prefixes like ^, ~, >=, etc.
    const match = versionString.match(/\d+\.\d+(\.\d+)?/);
    return match ? match[0] : undefined;
  }
}