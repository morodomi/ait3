import { readFile } from 'fs/promises';

export interface PackageJsonConfig {
  name: string;
  version: string;
  repository?: string;
  files?: string[];
  scripts: Record<string, string>;
  keywords: string[];
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  description: string;
  author: string;
  license: string;
  main: string;
  bin: Record<string, string>;
}

export class ReleaseTestHelpers {
  private static packageJsonCache: PackageJsonConfig | null = null;

  static async getPackageJson(): Promise<PackageJsonConfig> {
    if (this.packageJsonCache) {
      return this.packageJsonCache;
    }

    const packageJsonContent = await readFile('package.json', 'utf-8');
    this.packageJsonCache = JSON.parse(packageJsonContent) as PackageJsonConfig;
    return this.packageJsonCache;
  }

  static async readProjectFile(filePath: string): Promise<string> {
    return await readFile(filePath, 'utf-8');
  }

  static validatePackageJsonField<T>(
    packageJson: PackageJsonConfig,
    field: keyof PackageJsonConfig,
    expectedValue?: T
  ): T {
    const value = packageJson[field] as T;
    if (expectedValue !== undefined) {
      expect(value).toBe(expectedValue);
    } else {
      expect(value).toBeDefined();
    }
    return value;
  }

  static validateArrayContains(
    array: string[] | undefined,
    expectedItems: string[]
  ): void {
    expect(array).toBeDefined();
    for (const item of expectedItems) {
      expect(array).toContain(item);
    }
  }

  static validateStringContains(
    content: string,
    expectedSubstrings: string[]
  ): void {
    for (const substring of expectedSubstrings) {
      expect(content).toContain(substring);
    }
  }

  static clearCache(): void {
    this.packageJsonCache = null;
  }
}