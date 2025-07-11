import linguist from 'linguist-js';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import type { LanguageDetector } from '../interfaces/LanguageDetector.js';
import type { LanguageResult } from '../../common/types/analyzer.js';

export class LinguistLanguageDetector implements LanguageDetector {
  constructor(private rootPath: string) {}

  async detectLanguages(path?: string): Promise<LanguageResult[]> {
    const targetPath = path || this.rootPath;

    try {
      // Use linguist-js for accurate language detection
      const result = await linguist(targetPath);
      
      // Handle different response formats from linguist-js
      const languages = result.languages || result;
      
      if (!languages || typeof languages !== 'object' || Object.keys(languages).length === 0) {
        return [];
      }

      // Find the highest percentage for primary language detection
      const maxPercentage = Math.max(
        ...Object.values(languages).map((lang) => {
          if (lang && typeof lang === 'object' && 'percentage' in lang) {
            return (lang as { percentage?: number }).percentage || 0;
          }
          return 0;
        })
      );

      // Convert linguist results to our format
      const languageResults: LanguageResult[] = Object.entries(languages)
        .filter(([name]) => {
          // Filter out metadata fields
          return name !== 'count' && name !== 'bytes' && name !== 'lines' && 
                 name !== 'results' && name !== 'total' && name !== 'unknown';
        })
        .map(([name, data]) => {
          const percentage = data && typeof data === 'object' && 'percentage' in data
            ? (data as { percentage?: number }).percentage || 0
            : 0;
          const files = data && typeof data === 'object' && 'files' in data
            ? Array.isArray((data as { files?: unknown }).files) 
              ? ((data as { files?: unknown[] }).files?.length || 0)
              : (typeof (data as { files?: number }).files === 'number' ? (data as { files?: number }).files : 0)
            : 0;
          
          return {
            name,
            percentage,
            files,
            primaryLanguage: percentage === maxPercentage
          };
        })
        .filter(lang => lang.files > 0 || lang.percentage > 0)
        .sort((a, b) => b.percentage - a.percentage);

      // If no languages detected, use fallback
      if (languageResults.length === 0) {
        return this.fallbackDetection(targetPath);
      }

      return languageResults;
    } catch (_error) {
      // Fallback to simple file extension-based detection
      return this.fallbackDetection(targetPath);
    }
  }

  async getPrimaryLanguage(path?: string): Promise<LanguageResult | null> {
    const languages = await this.detectLanguages(path);
    
    if (languages.length === 0) {
      return null;
    }

    // Return the first language (highest percentage)
    return languages[0];
  }

  private async fallbackDetection(targetPath: string): Promise<LanguageResult[]> {
    try {
      const fileExtensions = await this.collectFileExtensions(targetPath);
      
      if (fileExtensions.size === 0) {
        return [];
      }

      // Map extensions to languages
      const languageCounts = new Map<string, number>();
      for (const [ext, count] of fileExtensions) {
        const language = this.getLanguageFromExtension(ext);
        if (language) {
          languageCounts.set(
            language,
            (languageCounts.get(language) || 0) + count
          );
        }
      }

      // Calculate total files
      const totalFiles = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0);
      
      if (totalFiles === 0) {
        return [];
      }

      // Find primary language
      const maxFiles = Math.max(...Array.from(languageCounts.values()));

      // Convert to LanguageResult format
      const results: LanguageResult[] = Array.from(languageCounts.entries())
        .map(([name, files]) => ({
          name,
          percentage: (files / totalFiles) * 100,
          files,
          primaryLanguage: files === maxFiles
        }))
        .sort((a, b) => b.files - a.files);

      return results;
    } catch {
      return [];
    }
  }

  private async collectFileExtensions(
    dir: string,
    extensions = new Map<string, number>()
  ): Promise<Map<string, number>> {
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !this.shouldIgnoreDirectory(entry)) {
          await this.collectFileExtensions(fullPath, extensions);
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (ext) {
            extensions.set(ext, (extensions.get(ext) || 0) + 1);
          }
        }
      }
    } catch {
      // Ignore errors in subdirectories
    }
    
    return extensions;
  }

  private shouldIgnoreDirectory(name: string): boolean {
    const ignoreDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '__pycache__',
      '.pytest_cache',
      'vendor'
    ];
    return ignoreDirs.includes(name);
  }

  private getLanguageFromExtension(ext: string): string | null {
    const extensionMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.php': 'PHP',
      '.java': 'Java',
      '.cs': 'C#',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'C',
      '.hpp': 'C++',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.xml': 'XML',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.less': 'Less',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bash': 'Shell',
      '.ps1': 'PowerShell',
      '.r': 'R',
      '.scala': 'Scala',
      '.dart': 'Dart',
      '.lua': 'Lua',
      '.perl': 'Perl',
      '.pl': 'Perl'
    };

    return extensionMap[ext] || null;
  }
}