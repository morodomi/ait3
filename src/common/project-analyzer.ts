import { readFile, access } from 'fs/promises';

export interface ProjectAnalysis {
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

/**
 * Analyze project to detect language, framework, and configuration
 */
export async function analyzeProject(): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    language: 'Unknown',
    framework: 'Unknown',
    buildSystem: 'Unknown',
    testFramework: 'Unknown',
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
    projectName: 'my-project'
  };
  
  // Check for Node.js/TypeScript
  try {
    await access('package.json');
    const packageContent = await readFile('package.json', 'utf-8');
    
    try {
      const pkg = JSON.parse(packageContent);
      analysis.projectName = pkg.name || 'my-project';
      analysis.language = 'Node.js';
      analysis.buildSystem = 'npm';
      
      // Check for TypeScript
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        analysis.language = 'Node.js TypeScript';
        analysis.framework = 'TypeScript';
      }
      
      // Detect test framework
      if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
        analysis.testFramework = 'Vitest';
      } else if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
        analysis.testFramework = 'Jest';
      }
      
      // Extract commands
      if (pkg.scripts) {
        analysis.commands.install = 'npm install';
        analysis.commands.test = pkg.scripts.test ? 'npm test' : 'echo "No test script"';
        analysis.commands.build = pkg.scripts.build ? 'npm run build' : 'echo "No build script"';
        analysis.commands.dev = pkg.scripts.dev ? 'npm run dev' : pkg.scripts.start ? 'npm start' : 'echo "No dev script"';
      }
    } catch {
      // Malformed package.json, continue with defaults
    }
  } catch {
    // No package.json, check other project types
    await checkPythonProject(analysis);
    await checkGoProject(analysis);
  }
  
  // Check for Docker
  await checkDockerFiles(analysis);
  
  return analysis;
}

async function checkPythonProject(analysis: ProjectAnalysis): Promise<void> {
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
    // Not a pip project, check for poetry
    try {
      await access('pyproject.toml');
      analysis.language = 'Python';
      analysis.framework = 'poetry';
      analysis.buildSystem = 'poetry';
      analysis.commands.install = 'poetry install';
      analysis.commands.test = 'poetry run pytest';
      analysis.commands.build = 'poetry build';
      analysis.commands.dev = 'poetry run python app.py';
    } catch {
      // Not a Python project
    }
  }
}

async function checkGoProject(analysis: ProjectAnalysis): Promise<void> {
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
    // Not a Go project
  }
}

async function checkDockerFiles(analysis: ProjectAnalysis): Promise<void> {
  try {
    await access('Dockerfile');
    analysis.docker.hasDockerfile = true;
  } catch {
    // No Dockerfile
  }
  
  // Check for Docker Compose files
  const composeFiles = ['compose.yml', 'compose.yaml', 'docker-compose.yml', 'docker-compose.yaml'];
  for (const file of composeFiles) {
    try {
      await access(file);
      analysis.docker.hasCompose = true;
      analysis.docker.composeFile = file;
      break;
    } catch {
      // Continue checking
    }
  }
}