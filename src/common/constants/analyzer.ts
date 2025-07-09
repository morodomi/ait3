/**
 * Constants for project analysis
 */

export const IGNORE_DIRECTORIES = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  '.next',
  '__pycache__',
  '.pytest_cache',
  'vendor',
  '.venv',
  'venv',
  'env',
  '.env',
  '.idea',
  '.vscode',
  '.DS_Store'
] as const;

export const SOURCE_DIRECTORIES = ['src', 'lib', 'app', 'source'] as const;
export const TEST_DIRECTORIES = ['test', 'tests', 'spec', 'specs', '__tests__'] as const;
export const BUILD_DIRECTORIES = ['dist', 'build', 'out', 'public', 'target'] as const;
export const CONFIG_DIRECTORIES = ['config', 'configs', '.config'] as const;
export const DOCS_DIRECTORIES = ['docs', 'doc', 'documentation'] as const;

export const ESLINT_CONFIG_FILES = [
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  '.eslintrc'
] as const;

export const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  'prettier.config.js'
] as const;

export const CI_CONFIG_INDICATORS = [
  '.github/workflows',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.circleci',
  'azure-pipelines.yml',
  '.travis.yml',
  'bitbucket-pipelines.yml'
] as const;

export const DOCKER_INDICATORS = [
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.dockerignore'
] as const;

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
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
} as const;

export const FRAMEWORK_INDICATORS = {
  nextjs: {
    files: ['next.config.js', 'next.config.mjs'],
    packageDep: 'next'
  },
  django: {
    files: ['manage.py'],
    requirementsDep: 'django'
  },
  flask: {
    files: ['app.py', 'application.py'],
    requirementsDep: 'flask'
  },
  laravel: {
    files: ['artisan', 'bootstrap/app.php'],
    composerDep: 'laravel/framework'
  },
  express: {
    packageDep: 'express'
  },
  fastapi: {
    requirementsDep: 'fastapi'
  },
  rails: {
    files: ['Gemfile', 'config/application.rb'],
    gemDep: 'rails'
  }
} as const;

export const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const CACHE_DIR = '.ait3/cache';
export const CACHE_FILE = 'project-analysis.json';