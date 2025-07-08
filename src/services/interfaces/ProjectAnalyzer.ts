import type { ProjectAnalysis } from '../../common/types/analyzer.js';

/**
 * Facade interface for comprehensive project analysis
 * Combines language detection, command detection, and structure analysis
 */
export interface ProjectAnalyzer {
  /**
   * Perform comprehensive analysis of the project
   * @param path - Project path to analyze (defaults to current directory)
   * @returns Complete project analysis including languages, commands, and structure
   */
  analyzeProject(path?: string): Promise<ProjectAnalysis>;
}