import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

/**
 * Common file utilities used across services
 */
export class FileUtils {
  /**
   * Check if a file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if any of the given files exist
   */
  static async anyExists(basePath: string, files: string[]): Promise<boolean> {
    const checks = await Promise.all(
      files.map(file => this.exists(join(basePath, file)))
    );
    return checks.some(exists => exists);
  }

  /**
   * Read and parse JSON file
   */
  static async readJson<T = any>(filePath: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Read text file
   */
  static async readText(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Read package.json from a directory
   */
  static async readPackageJson(dirPath: string): Promise<any> {
    return this.readJson(join(dirPath, 'package.json'));
  }

  /**
   * Read composer.json from a directory
   */
  static async readComposerJson(dirPath: string): Promise<any> {
    return this.readJson(join(dirPath, 'composer.json'));
  }

  /**
   * Read pyproject.toml from a directory
   */
  static async readPyprojectToml(dirPath: string): Promise<string | null> {
    return this.readText(join(dirPath, 'pyproject.toml'));
  }

  /**
   * Extract version from version string (removes prefixes like ^, ~, >=)
   */
  static extractVersion(versionString?: string): string | undefined {
    if (!versionString) return undefined;
    
    const match = versionString.match(/\d+\.\d+(\.\d+)?/);
    return match ? match[0] : undefined;
  }
}