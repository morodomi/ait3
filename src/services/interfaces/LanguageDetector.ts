import type { LanguageResult } from '../../common/types/analyzer.js';

/**
 * Interface for detecting programming languages in a project
 */
export interface LanguageDetector {
  /**
   * Detect all languages in the project
   * @param path - Project path to analyze (defaults to current directory)
   * @returns Array of detected languages with usage statistics
   */
  detectLanguages(path?: string): Promise<LanguageResult[]>;

  /**
   * Get the primary language of the project
   * @param path - Project path to analyze (defaults to current directory)
   * @returns Primary language or null if no languages detected
   */
  getPrimaryLanguage(path?: string): Promise<LanguageResult | null>;
}