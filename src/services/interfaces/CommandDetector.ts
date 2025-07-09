import type { CommandInfo } from '../../common/types/analyzer.js';

/**
 * Interface for detecting common development commands in a project
 */
export interface CommandDetector {
  /**
   * Detect the test command for the project
   * @param path - Project path to analyze (defaults to current directory)
   * @param language - Hint about the primary language (optional)
   * @returns Command information with confidence score
   */
  detectTestCommand(path?: string, language?: string): Promise<CommandInfo>;

  /**
   * Detect the lint command for the project
   * @param path - Project path to analyze (defaults to current directory)
   * @param language - Hint about the primary language (optional)
   * @returns Command information with confidence score
   */
  detectLintCommand(path?: string, language?: string): Promise<CommandInfo>;

  /**
   * Detect the format command for the project
   * @param path - Project path to analyze (defaults to current directory)
   * @param language - Hint about the primary language (optional)
   * @returns Command information with confidence score
   */
  detectFormatCommand(path?: string, language?: string): Promise<CommandInfo>;

  /**
   * Detect the build command for the project
   * @param path - Project path to analyze (defaults to current directory)
   * @param language - Hint about the primary language (optional)
   * @returns Command information with confidence score
   */
  detectBuildCommand(path?: string, language?: string): Promise<CommandInfo>;
}