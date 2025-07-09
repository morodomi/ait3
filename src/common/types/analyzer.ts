// Type definitions for ProjectAnalyzer feature

export interface LanguageResult {
  name: string;
  percentage: number;
  files: number;
  primaryLanguage: boolean;
}

export interface FrameworkInfo {
  name: string;
  version?: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'library' | 'unknown';
  confidence: number; // 0-1
}

export interface CommandInfo {
  command: string;
  detected: boolean;
  source: 'package.json' | 'config-file' | 'default' | 'not-found' | 'convention';
  confidence: number; // 0-1
}

export interface ProjectCommands {
  test?: CommandInfo;
  lint?: CommandInfo;
  format?: CommandInfo;
  build?: CommandInfo;
}

export interface StructureAnalysis {
  rootPath: string;
  directories: DirectoryInfo[];
  hasGitRepository: boolean;
  hasCICD: boolean;
  hasDocker: boolean;
}

// Alias for backward compatibility
export type ProjectStructure = StructureAnalysis;

export interface DirectoryInfo {
  path: string;
  name: string;
  type: 'source' | 'test' | 'config' | 'docs' | 'build' | 'other';
  fileCount: number;
}

export interface DependencyAnalysis {
  direct: DependencyInfo[];
  dev: DependencyInfo[];
  peer?: DependencyInfo[];
  total: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
}

export interface ProjectAnalysis {
  root: string;
  languages: LanguageResult[];
  framework: FrameworkInfo;
  commands: ProjectCommands;
  structure: StructureAnalysis;
  dependencies?: DependencyAnalysis;
  timestamp: string;
}