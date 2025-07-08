import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import type { ProjectAnalyzer } from '../interfaces/ProjectAnalyzer.js';
import type { LanguageDetector } from '../interfaces/LanguageDetector.js';
import type { CommandDetector } from '../interfaces/CommandDetector.js';
import type { StructureAnalyzer } from '../interfaces/StructureAnalyzer.js';
import type { ProjectAnalysis } from '../../common/types/analyzer.js';

export class DefaultProjectAnalyzer implements ProjectAnalyzer {
  private cacheDir: string;
  private cacheFile: string;
  private cache: ProjectAnalysis | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private rootPath: string,
    private languageDetector: LanguageDetector,
    private commandDetector: CommandDetector,
    private structureAnalyzer: StructureAnalyzer
  ) {
    this.cacheDir = join(this.rootPath, '.ait3/cache');
    this.cacheFile = join(this.cacheDir, 'project-analysis.json');
  }

  async analyzeProject(path?: string): Promise<ProjectAnalysis> {
    const targetPath = path || this.rootPath;

    // Check cache first
    const cached = await this.getCachedAnalysis(targetPath);
    if (cached) {
      return cached;
    }

    // Perform analysis
    const analysis = await this.performAnalysis(targetPath);

    // Cache the result
    await this.cacheAnalysis(analysis);

    return analysis;
  }

  private async performAnalysis(targetPath: string): Promise<ProjectAnalysis> {
    // Initialize result object
    const analysis: ProjectAnalysis = {
      root: targetPath,
      languages: [],
      framework: {
        name: 'Unknown',
        type: 'unknown',
        confidence: 0
      },
      commands: {
        test: undefined,
        lint: undefined,
        format: undefined,
        build: undefined
      },
      structure: {
        rootPath: targetPath,
        directories: [],
        hasGitRepository: false,
        hasCICD: false,
        hasDocker: false
      },
      timestamp: new Date().toISOString()
    };

    // Detect languages with error handling
    try {
      analysis.languages = await this.languageDetector.detectLanguages(targetPath);
    } catch (error) {
      // Continue with empty languages on error
      analysis.languages = [];
    }

    // Get primary language for command detection
    let primaryLanguage: string | undefined;
    try {
      const primary = await this.languageDetector.getPrimaryLanguage(targetPath);
      primaryLanguage = primary?.name;
    } catch {
      // Continue without primary language
    }

    // Detect commands
    try {
      const [test, lint, format, build] = await Promise.all([
        this.commandDetector.detectTestCommand(targetPath, primaryLanguage),
        this.commandDetector.detectLintCommand(targetPath, primaryLanguage),
        this.commandDetector.detectFormatCommand(targetPath, primaryLanguage),
        this.commandDetector.detectBuildCommand(targetPath, primaryLanguage)
      ]);

      analysis.commands = { test, lint, format, build };
    } catch {
      // Continue with partial command detection
    }

    // Analyze structure
    try {
      analysis.structure = await this.structureAnalyzer.analyzeStructure(targetPath);
    } catch {
      // Continue with default structure
    }

    // Detect framework
    try {
      analysis.framework = await this.structureAnalyzer.detectFramework(targetPath, primaryLanguage);
    } catch {
      // Continue with unknown framework
    }

    return analysis;
  }

  private async getCachedAnalysis(targetPath: string): Promise<ProjectAnalysis | null> {
    // Check in-memory cache first
    if (this.cache && this.cache.root === targetPath) {
      const now = Date.now();
      if (now - this.cacheTimestamp < this.CACHE_DURATION) {
        return this.cache;
      }
    }

    // Check file cache
    try {
      await access(this.cacheFile, constants.F_OK);
      const content = await readFile(this.cacheFile, 'utf-8');
      const cached = JSON.parse(content) as ProjectAnalysis;

      if (cached.root === targetPath) {
        const cacheTime = new Date(cached.timestamp).getTime();
        const now = Date.now();

        if (now - cacheTime < this.CACHE_DURATION) {
          // Update in-memory cache
          this.cache = cached;
          this.cacheTimestamp = cacheTime;
          return cached;
        }
      }
    } catch {
      // No cache or invalid cache
    }

    return null;
  }

  private async cacheAnalysis(analysis: ProjectAnalysis): Promise<void> {
    // Update in-memory cache
    this.cache = analysis;
    this.cacheTimestamp = Date.now();

    // Save to file
    try {
      await mkdir(this.cacheDir, { recursive: true });
      await writeFile(this.cacheFile, JSON.stringify(analysis, null, 2));
    } catch {
      // Ignore cache write errors
    }
  }
}