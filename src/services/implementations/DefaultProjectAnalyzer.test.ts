import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DefaultProjectAnalyzer } from './DefaultProjectAnalyzer.js';
import type { LanguageDetector } from '../interfaces/LanguageDetector.js';
import type { CommandDetector } from '../interfaces/CommandDetector.js';
import type { StructureAnalyzer } from '../interfaces/StructureAnalyzer.js';

describe('DefaultProjectAnalyzer', () => {
  let testDir: string;
  let analyzer: DefaultProjectAnalyzer;
  let mockLanguageDetector: LanguageDetector;
  let mockCommandDetector: CommandDetector;
  let mockStructureAnalyzer: StructureAnalyzer;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-project-analyzer-'));
    
    // Create mocks for dependencies
    mockLanguageDetector = {
      detectLanguages: vi.fn(),
      getPrimaryLanguage: vi.fn()
    };
    
    mockCommandDetector = {
      detectTestCommand: vi.fn(),
      detectLintCommand: vi.fn(),
      detectFormatCommand: vi.fn(),
      detectBuildCommand: vi.fn()
    };
    
    mockStructureAnalyzer = {
      analyzeStructure: vi.fn(),
      detectFramework: vi.fn()
    };
    
    analyzer = new DefaultProjectAnalyzer(
      testDir,
      mockLanguageDetector,
      mockCommandDetector,
      mockStructureAnalyzer
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('analyzeProject', () => {
    it('should perform comprehensive TypeScript project analysis', async () => {
      // Mock language detection
      const languages = [
        { name: 'TypeScript', percentage: 90, files: 10, primaryLanguage: true },
        { name: 'JSON', percentage: 10, files: 3, primaryLanguage: false }
      ];
      vi.mocked(mockLanguageDetector.detectLanguages).mockResolvedValue(languages);
      vi.mocked(mockLanguageDetector.getPrimaryLanguage).mockResolvedValue(languages[0]);

      // Mock command detection
      vi.mocked(mockCommandDetector.detectTestCommand).mockResolvedValue({
        command: 'npm test',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
      vi.mocked(mockCommandDetector.detectLintCommand).mockResolvedValue({
        command: 'npm run lint',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
      vi.mocked(mockCommandDetector.detectFormatCommand).mockResolvedValue({
        command: 'npm run format',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
      vi.mocked(mockCommandDetector.detectBuildCommand).mockResolvedValue({
        command: 'npm run build',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });

      // Mock structure analysis
      vi.mocked(mockStructureAnalyzer.analyzeStructure).mockResolvedValue({
        rootPath: testDir,
        directories: [
          { path: join(testDir, 'src'), name: 'src', type: 'source', fileCount: 10 },
          { path: join(testDir, 'tests'), name: 'tests', type: 'test', fileCount: 5 }
        ],
        hasGitRepository: true,
        hasCICD: true,
        hasDocker: false
      });
      vi.mocked(mockStructureAnalyzer.detectFramework).mockResolvedValue({
        name: 'Next.js',
        version: '13.0.0',
        type: 'fullstack',
        confidence: 0.95
      });

      const analysis = await analyzer.analyzeProject();

      expect(analysis.root).toBe(testDir);
      expect(analysis.languages).toEqual(languages);
      expect(analysis.framework.name).toBe('Next.js');
      expect(analysis.commands.test?.command).toBe('npm test');
      expect(analysis.commands.lint?.command).toBe('npm run lint');
      expect(analysis.commands.format?.command).toBe('npm run format');
      expect(analysis.commands.build?.command).toBe('npm run build');
      expect(analysis.structure.hasGitRepository).toBe(true);
      expect(analysis.structure.directories).toHaveLength(2);
      expect(analysis.timestamp).toBeDefined();

      // Verify all detectors were called with correct arguments
      expect(mockLanguageDetector.detectLanguages).toHaveBeenCalledWith(testDir);
      expect(mockCommandDetector.detectTestCommand).toHaveBeenCalledWith(testDir, 'TypeScript');
      expect(mockStructureAnalyzer.detectFramework).toHaveBeenCalledWith(testDir, 'TypeScript');
    });

    it('should handle Python Flask project analysis', async () => {
      // Mock Python detection
      vi.mocked(mockLanguageDetector.detectLanguages).mockResolvedValue([
        { name: 'Python', percentage: 100, files: 8, primaryLanguage: true }
      ]);
      vi.mocked(mockLanguageDetector.getPrimaryLanguage).mockResolvedValue({
        name: 'Python', percentage: 100, files: 8, primaryLanguage: true
      });

      // Mock Python commands
      vi.mocked(mockCommandDetector.detectTestCommand).mockResolvedValue({
        command: 'pytest',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
      vi.mocked(mockCommandDetector.detectLintCommand).mockResolvedValue({
        command: 'ruff check',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
      vi.mocked(mockCommandDetector.detectFormatCommand).mockResolvedValue({
        command: 'black .',
        detected: true,
        source: 'config-file',
        confidence: 0.9
      });
      vi.mocked(mockCommandDetector.detectBuildCommand).mockResolvedValue({
        command: '',
        detected: false,
        source: 'not-found',
        confidence: 0
      });

      // Mock Flask detection
      vi.mocked(mockStructureAnalyzer.detectFramework).mockResolvedValue({
        name: 'Flask',
        version: '2.3.0',
        type: 'backend',
        confidence: 0.9
      });
      vi.mocked(mockStructureAnalyzer.analyzeStructure).mockResolvedValue({
        rootPath: testDir,
        directories: [
          { path: join(testDir, 'app'), name: 'app', type: 'source', fileCount: 5 }
        ],
        hasGitRepository: true,
        hasCICD: false,
        hasDocker: true
      });

      const analysis = await analyzer.analyzeProject();

      expect(analysis.languages[0].name).toBe('Python');
      expect(analysis.framework.name).toBe('Flask');
      expect(analysis.commands.test?.command).toBe('pytest');
      expect(analysis.commands.lint?.command).toBe('ruff check');
      expect(analysis.commands.build?.detected).toBe(false);
    });

    it('should handle project with no primary language', async () => {
      vi.mocked(mockLanguageDetector.detectLanguages).mockResolvedValue([]);
      vi.mocked(mockLanguageDetector.getPrimaryLanguage).mockResolvedValue(null);

      // Commands should still be detected without language hint
      vi.mocked(mockCommandDetector.detectTestCommand).mockResolvedValue({
        command: 'npm test',
        detected: false,
        source: 'default',
        confidence: 0.3
      });

      vi.mocked(mockStructureAnalyzer.detectFramework).mockResolvedValue({
        name: 'Unknown',
        type: 'unknown',
        confidence: 0
      });
      vi.mocked(mockStructureAnalyzer.analyzeStructure).mockResolvedValue({
        rootPath: testDir,
        directories: [],
        hasGitRepository: false,
        hasCICD: false,
        hasDocker: false
      });

      const analysis = await analyzer.analyzeProject();

      expect(analysis.languages).toHaveLength(0);
      expect(analysis.framework.name).toBe('Unknown');
      expect(mockCommandDetector.detectTestCommand).toHaveBeenCalledWith(testDir, undefined);
    });

    it('should include cache functionality', async () => {
      // Set up mocks
      vi.mocked(mockLanguageDetector.detectLanguages).mockResolvedValue([
        { name: 'TypeScript', percentage: 100, files: 1, primaryLanguage: true }
      ]);
      vi.mocked(mockLanguageDetector.getPrimaryLanguage).mockResolvedValue({
        name: 'TypeScript', percentage: 100, files: 1, primaryLanguage: true
      });

      // First call
      await analyzer.analyzeProject();
      expect(mockLanguageDetector.detectLanguages).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const cachedResult = await analyzer.analyzeProject();
      expect(mockLanguageDetector.detectLanguages).toHaveBeenCalledTimes(1); // Not called again
      expect(cachedResult.languages[0].name).toBe('TypeScript');
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock language detector to throw error
      vi.mocked(mockLanguageDetector.detectLanguages).mockRejectedValue(
        new Error('Language detection failed')
      );

      // Other detectors should still work
      vi.mocked(mockCommandDetector.detectTestCommand).mockResolvedValue({
        command: 'npm test',
        detected: true,
        source: 'package.json',
        confidence: 1.0
      });
      vi.mocked(mockStructureAnalyzer.analyzeStructure).mockResolvedValue({
        rootPath: testDir,
        directories: [],
        hasGitRepository: false,
        hasCICD: false,
        hasDocker: false
      });

      // Should not throw, but handle error gracefully
      const analysis = await analyzer.analyzeProject();
      
      expect(analysis.languages).toHaveLength(0); // Empty on error
      expect(analysis.commands.test?.command).toBe('npm test'); // Other parts still work
    });

    it('should pass custom path to all detectors', async () => {
      const customPath = '/custom/project/path';
      
      vi.mocked(mockLanguageDetector.detectLanguages).mockResolvedValue([]);
      vi.mocked(mockLanguageDetector.getPrimaryLanguage).mockResolvedValue(null);
      vi.mocked(mockCommandDetector.detectTestCommand).mockResolvedValue({
        command: '', detected: false, source: 'not-found', confidence: 0
      });
      vi.mocked(mockStructureAnalyzer.analyzeStructure).mockResolvedValue({
        rootPath: customPath,
        directories: [],
        hasGitRepository: false,
        hasCICD: false,
        hasDocker: false
      });
      vi.mocked(mockStructureAnalyzer.detectFramework).mockResolvedValue({
        name: 'Unknown', type: 'unknown', confidence: 0
      });

      await analyzer.analyzeProject(customPath);

      expect(mockLanguageDetector.detectLanguages).toHaveBeenCalledWith(customPath);
      expect(mockCommandDetector.detectTestCommand).toHaveBeenCalledWith(customPath, undefined);
      expect(mockStructureAnalyzer.analyzeStructure).toHaveBeenCalledWith(customPath);
      expect(mockStructureAnalyzer.detectFramework).toHaveBeenCalledWith(customPath, undefined);
    });
  });
});