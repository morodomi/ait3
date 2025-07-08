import type { StructureAnalysis, FrameworkInfo } from '../../common/types/analyzer.js';

/**
 * Interface for analyzing project structure and detecting frameworks
 */
export interface StructureAnalyzer {
  /**
   * Analyze the project structure
   * @param path - Project path to analyze (defaults to current directory)
   * @returns Detailed structure analysis
   */
  analyzeStructure(path?: string): Promise<StructureAnalysis>;

  /**
   * Detect the framework used in the project
   * @param path - Project path to analyze (defaults to current directory)
   * @param language - Hint about the primary language (optional)
   * @returns Framework information with confidence score
   */
  detectFramework(path?: string, language?: string): Promise<FrameworkInfo>;
}