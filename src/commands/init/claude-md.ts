import { writeFile, access, readFile } from 'fs/promises';
import { join } from 'path';
import type { CLIResult } from '../../common/types.js';
import { STYLES } from '../../common/styles.js';
import { ensureMultipleDirectories } from '../../common/file-operations.js';
import { 
  generateComprehensiveTemplate, 
  generateDockerSection, 
  generateAiGuidelinesSection,
  type TemplateVariables 
} from '../../common/claude-md-templates.js';

interface InitClaudeMdArgs {
  force?: boolean;
  detailed?: boolean;
  json?: boolean;
  output?: string;
}

interface ProjectAnalysis {
  language: string;
  framework: string;
  buildSystem: string;
  testFramework: string;
  commands: {
    install: string;
    test: string;
    build: string;
    dev: string;
  };
  docker: {
    hasDockerfile: boolean;
    hasCompose: boolean;
    composeFile?: string;
  };
  architecture: string;
  projectName: string;
}

export async function initClaudeMdCommand(args: InitClaudeMdArgs): Promise<CLIResult> {
  try {
    // Analyze project
    const analysis = await analyzeProject();
    
    // Create output directories
    const createdDirectories = await ensureDirectories();
    
    // Generate files
    await generateAnalysisFiles(analysis);
    await generateClaudeMdTemplate(analysis);
    
    // Build result message
    const messages: string[] = [];
    
    // Add directory creation messages
    for (const dir of createdDirectories) {
      messages.push(`${STYLES.success('SUCCESS:')} Created directory: ${STYLES.info(dir)}`);
    }
    
    if (analysis.language !== 'unknown') {
      if (analysis.language === 'Node.js TypeScript') {
        messages.push(`${STYLES.success('SUCCESS:')} Node.js TypeScript project detected`);
      } else if (analysis.language === 'Python') {
        messages.push(`${STYLES.success('SUCCESS:')} Python project detected`);
      } else if (analysis.language === 'Go') {
        messages.push(`${STYLES.success('SUCCESS:')} Go project detected`);
      } else if (analysis.language === 'PHP') {
        messages.push(`${STYLES.success('SUCCESS:')} PHP Composer project detected`);
      } else {
        messages.push(`${STYLES.success('SUCCESS:')} ${analysis.language} project detected`);
      }
    } else {
      messages.push(`${STYLES.warning('⚠')} Unknown project type`);
      messages.push(`${STYLES.info('INFO:')} Generic template generated`);
    }
    
    if (analysis.docker.hasDockerfile) {
      messages.push(`${STYLES.success('SUCCESS:')} Docker detected: Dockerfile`);
    }
    
    if (analysis.docker.hasCompose) {
      messages.push(`${STYLES.success('SUCCESS:')} Docker Compose detected: ${analysis.docker.composeFile}`);
    }
    
    if (analysis.testFramework !== 'unknown') {
      messages.push(`${STYLES.success('SUCCESS:')} ${analysis.testFramework} test framework detected`);
    }
    
    if (analysis.architecture === 'Pure Functions + Service Injection') {
      messages.push(`${STYLES.success('SUCCESS:')} AIT³ architecture detected: ${analysis.architecture}`);
    }
    
    // Add commands
    messages.push(`${STYLES.info('INFO:')} ${analysis.commands.install}`);
    messages.push(`${STYLES.info('INFO:')} ${analysis.commands.test}`);
    messages.push(`${STYLES.info('INFO:')} ${analysis.commands.build}`);
    
    return {
      success: true,
      message: messages.join('\n')
    };
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('read-only')) {
      return {
        success: false,
        message: `${STYLES.danger('ERROR: Failed to create')}: Permission denied`
      };
    }
    
    if (error instanceof Error && error.message.includes('Malformed package.json')) {
      // For malformed package.json, still generate files but with warning
      try {
        const createdDirectories = await ensureDirectories();
        const defaultAnalysis: ProjectAnalysis = {
          language: 'unknown',
          framework: 'unknown',
          buildSystem: 'unknown',
          testFramework: 'unknown',
          commands: {
            install: 'echo "No install command detected"',
            test: 'echo "No test command detected"',
            build: 'echo "No build command detected"',
            dev: 'echo "No dev command detected"'
          },
          docker: {
            hasDockerfile: false,
            hasCompose: false
          },
          architecture: 'Unknown',
          projectName: 'test-project'
        };
        
        await generateAnalysisFiles(defaultAnalysis);
        await generateClaudeMdTemplate(defaultAnalysis);
        
        return {
          success: true,
          message: `${STYLES.warning('⚠')} Malformed package.json
${STYLES.info('INFO:')} Generic template generated`
        };
      } catch {
        return {
          success: false,
          message: `${STYLES.danger('ERROR: Failed to create')}: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    return {
      success: false,
      message: `${STYLES.danger('ERROR: Failed to create')}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function analyzeProject(): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    language: 'unknown',
    framework: 'unknown',
    buildSystem: 'unknown',
    testFramework: 'unknown',
    commands: {
      install: 'echo "No install command detected"',
      test: 'echo "No test command detected"',
      build: 'echo "No build command detected"',
      dev: 'echo "No dev command detected"'
    },
    docker: {
      hasDockerfile: false,
      hasCompose: false
    },
    architecture: 'Unknown',
    projectName: 'test-project'
  };
  
  // Check for Node.js/TypeScript
  try {
    await access('package.json');
    const packageContent = await readFile('package.json', 'utf-8');
    
    try {
      const pkg = JSON.parse(packageContent);
      analysis.projectName = pkg.name || 'test-project';
      analysis.language = 'Node.js';
      analysis.buildSystem = 'npm';
      
      // Check for TypeScript
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        analysis.language = 'Node.js TypeScript';
        try {
          await access('tsconfig.json');
          analysis.framework = 'TypeScript';
        } catch {
          // No tsconfig but has typescript dependency
        }
      }
      
      // Detect test framework
      if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
        analysis.testFramework = 'Vitest';
      } else if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
        analysis.testFramework = 'Jest';
      }
      
      // Extract commands from scripts
      if (pkg.scripts) {
        analysis.commands.install = 'npm install';
        analysis.commands.test = pkg.scripts.test ? 'npm test' : 'npm run test';
        analysis.commands.build = pkg.scripts.build ? 'npm run build' : 'echo "No build script"';
        analysis.commands.dev = pkg.scripts.dev ? 'npm run dev' : pkg.scripts.start ? 'npm start' : 'echo "No dev script"';
      }
      
    } catch (parseError) {
      throw new Error('Malformed package.json');
    }
    
  } catch (fileError) {
    // Check if it's a malformed package.json error (not a file access error)
    if (fileError instanceof Error && fileError.message === 'Malformed package.json') {
      throw fileError;
    }
    // Check for PHP
    try {
      await access('composer.json');
      analysis.language = 'PHP';
      analysis.framework = 'Composer';
      analysis.buildSystem = 'composer';
      analysis.commands.install = 'composer install';
      analysis.commands.test = 'composer test';
      analysis.commands.build = 'composer dump-autoload';
      analysis.commands.dev = 'php -S localhost:8000';
    } catch {
      // Check for Python
      try {
        await access('requirements.txt');
        analysis.language = 'Python';
        analysis.framework = 'pip';
        analysis.buildSystem = 'pip';
        analysis.commands.install = 'pip install -r requirements.txt';
        analysis.commands.test = 'pytest';
        analysis.commands.build = 'python -m build';
        analysis.commands.dev = 'python app.py';
      } catch {
        // Check for Python with pyproject.toml
        try {
          await access('pyproject.toml');
          analysis.language = 'Python';
          analysis.framework = 'poetry';
          analysis.buildSystem = 'poetry';
          analysis.commands.install = 'poetry install';
          analysis.commands.test = 'pytest';
          analysis.commands.build = 'poetry build';
          analysis.commands.dev = 'poetry run python app.py';
        } catch {
          // Check for Go
          try {
            await access('go.mod');
            analysis.language = 'Go';
            analysis.framework = 'Go modules';
            analysis.buildSystem = 'go';
            analysis.commands.install = 'go mod tidy';
            analysis.commands.test = 'go test ./...';
            analysis.commands.build = 'go build';
            analysis.commands.dev = 'go run main.go';
          } catch {
            // Unknown project type
          }
        }
      }
    }
  }
  
  // Check for Docker
  try {
    await access('Dockerfile');
    analysis.docker.hasDockerfile = true;
  } catch {
    // No Dockerfile
  }
  
  // Check for Docker Compose (new format first)
  try {
    await access('compose.yml');
    analysis.docker.hasCompose = true;
    analysis.docker.composeFile = 'compose.yml';
  } catch {
    try {
      await access('compose.yaml');
      analysis.docker.hasCompose = true;
      analysis.docker.composeFile = 'compose.yaml';
    } catch {
      try {
        await access('docker-compose.yml');
        analysis.docker.hasCompose = true;
        analysis.docker.composeFile = 'docker-compose.yml';
      } catch {
        // No compose file
      }
    }
  }
  
  // Check for AIT³ architecture pattern
  try {
    await access('src/commands');
    await access('src/services');
    await access('src/common');
    analysis.architecture = 'Pure Functions + Service Injection';
  } catch {
    // Not AIT³ architecture
  }
  
  return analysis;
}

async function ensureDirectories(): Promise<string[]> {
  const result = await ensureMultipleDirectories([
    'src/assets/templates',
    'docs/references'
  ]);
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to create directories');
  }
  
  return result.createdDirectories;
}

async function generateAnalysisFiles(analysis: ProjectAnalysis): Promise<void> {
  // Generate project analysis file
  const analysisContent = `# Project Analysis Results

Generated: ${new Date().toISOString()}
Project: ${analysis.projectName}

## Detected Language
${analysis.language}

## Build System
${analysis.buildSystem}

## Commands
- Install: ${analysis.commands.install}
- Test: ${analysis.commands.test}
- Build: ${analysis.commands.build}
- Dev: ${analysis.commands.dev}

## Docker Configuration
- Dockerfile: ${analysis.docker.hasDockerfile ? 'Yes' : 'No'}
- Docker Compose: ${analysis.docker.hasCompose ? `Yes (${analysis.docker.composeFile})` : 'No'}

## Architecture
${analysis.architecture}

## Test Framework
${analysis.testFramework}
`;
  
  await writeFile('docs/references/project-analysis.md', analysisContent, 'utf-8');
  
  // Generate detected commands file
  const commandsContent = `# Detected Commands

## Install Dependencies
\`\`\`bash
${analysis.commands.install}
\`\`\`

## Run Tests
\`\`\`bash
${analysis.commands.test}
\`\`\`

## Build Project
\`\`\`bash
${analysis.commands.build}
\`\`\`

## Development Server
\`\`\`bash
${analysis.commands.dev}
\`\`\`
`;
  
  await writeFile('docs/references/detected-commands.md', commandsContent, 'utf-8');
}

async function generateClaudeMdTemplate(analysis: ProjectAnalysis): Promise<void> {
  const templateVariables: TemplateVariables = {
    projectName: analysis.projectName,
    language: analysis.language,
    framework: analysis.framework,
    architecture: analysis.architecture,
    testFramework: analysis.testFramework,
    buildSystem: analysis.buildSystem,
    commands: analysis.commands
  };
  
  // Generate base template content
  let templateContent = generateComprehensiveTemplate(templateVariables);
  
  // Add Docker section if Docker is detected
  if (analysis.docker.hasDockerfile) {
    templateContent += generateDockerSection(
      analysis.docker.hasDockerfile,
      analysis.docker.composeFile
    );
  }
  
  // Add AI guidelines section
  templateContent += '\n\n' + generateAiGuidelinesSection();
  
  await writeFile('src/assets/templates/claude-md-template.md', templateContent, 'utf-8');
}