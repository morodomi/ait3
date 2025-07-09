/**
 * Shared utilities for CLAUDE.md template generation
 * Reduces code duplication between install and init commands
 */

export interface TemplateVariables {
  projectName?: string;
  language?: string;
  framework?: string;
  architecture?: string;
  testFramework?: string;
  buildSystem?: string;
  commands?: {
    install: string;
    test: string;
    build: string;
    dev: string;
  };
}

/**
 * Generate the AIT³ workflow section (common to both templates)
 */
export function generateAit3WorkflowSection(): string {
  return `## Development Workflow

## AIT³ Development Workflow

This project follows the AIT³ (AI + Ticket + Test + Tool) driven development workflow:

### Phase Flow
1. **PLANNING** → Socratic dialogue for approach validation
2. **RED** → Test-driven development with failing tests
3. **GREEN** → Implementation with 100% test pass rate
4. **REFACTOR** → Code optimization while maintaining tests
5. **SQUASH** → Git commit cleanup and integration

### Commands for Each Phase
- \`ait3 flow plan "feature-name"\` → Start planning phase
- \`ait3 flow red 0028\` → Create comprehensive tests
- \`ait3 flow green 0028\` → Implement feature
- \`ait3 flow refactor 0028\` → Optimize implementation
- \`ait3 flow squash 0028\` → Clean commit history

### Creating New Features
1. Create a ticket: \`ait3 ticket create "Feature name"\`
2. Start the ticket: \`ait3 ticket start XXXX\`
3. Follow the AIT³ phases (PLANNING → RED → GREEN → REFACTOR → SQUASH)
4. Complete: \`ait3 ticket complete XXXX\``;
}

/**
 * Generate architecture section
 */
export function generateArchitectureSection(vars: TemplateVariables): string {
  return `## Architecture
- **Language**: ${vars.language || '[LANGUAGE]'}
- **Framework**: ${vars.framework || '[FRAMEWORK]'}
- **Architecture Pattern**: ${vars.architecture || '[ARCHITECTURE_PATTERN]'}
- **Test Framework**: ${vars.testFramework || '[TEST_FRAMEWORK]'}
- **Build Tool**: ${vars.buildSystem || '[BUILD_TOOL]'}`;
}

/**
 * Generate key commands section
 */
export function generateKeyCommandsSection(vars: TemplateVariables): string {
  const commands = vars.commands || {
    install: '[INSTALL_COMMAND]',
    test: '[TEST_COMMAND]',
    build: '[BUILD_COMMAND]',
    dev: '[DEV_COMMAND]'
  };

  return `## Key Commands
\`\`\`bash
${commands.install}     # Install dependencies
${commands.build}       # Build the project
${commands.test}        # Run tests
${commands.dev}         # Start development server
\`\`\`

## Development Commands
- **Full Test**: \`${commands.test}\`
- **Build**: \`${commands.build}\`
- **Development**: \`${commands.dev}\``;
}

/**
 * Generate Claude Code actions section
 */
export function generateClaudeCodeActionsSection(vars: TemplateVariables): string {
  const commands = vars.commands || {
    install: '[INSTALL_COMMAND]',
    test: '[TEST_COMMAND]',
    build: '[BUILD_COMMAND]',
    dev: '[DEV_COMMAND]'
  };

  return `## Claude Code Actions
### Testing Commands
- **Full Test Suite**: \`${commands.test}\`
- **Development Mode**: \`${commands.dev}\`

### Build Commands
- **Production Build**: \`${commands.build}\`
- **Install Dependencies**: \`${commands.install}\``;
}

/**
 * Generate basic template structure (for install command)
 */
export function generateBasicTemplate(vars: TemplateVariables = {}): string {
  const sections = [
    `# Project: ${vars.projectName || '[PROJECT_NAME]'}`,
    '',
    '## Overview',
    '[DESCRIPTION]',
    '',
    generateArchitectureSection(vars),
    '',
    generateKeyCommandsSection(vars),
    '',
    generateAit3WorkflowSection(),
    '',
    '## Project Structure',
    '```',
    '[Key directories and their purposes]',
    'src/',
    '├── commands/       # [Purpose]',
    '├── services/       # [Purpose]',
    '├── common/        # [Purpose]',
    '└── assets/        # [Purpose]',
    '```',
    '',
    '## Business Logic',
    '[Core business logic explanation]',
    '',
    '### Key Algorithms',
    '1. [Algorithm 1]: [Brief explanation]',
    '2. [Algorithm 2]: [Brief explanation]',
    '',
    '## Testing Strategy',
    '- **Unit Tests**: [Location and approach]',
    '- **Integration Tests**: [Location and approach]',
    '- **Test Coverage**: [Target coverage percentage]',
    '',
    '## Code Style and Standards',
    '- **Linting**: [ESLint/Prettier configuration]',
    '- **Type Safety**: [TypeScript strict mode settings]',
    '- **Naming Conventions**: [Describe conventions]',
    '',
    '## Environment Setup',
    '### Required Environment Variables',
    '- `VAR_NAME`: [Description]',
    '',
    '### Development Setup',
    '1. [Step 1]',
    '2. [Step 2]',
    '',
    '## Deployment',
    '[Deployment process and considerations]',
    '',
    '## Important Considerations',
    '- [Key architectural decisions]',
    '- [Performance considerations]',
    '- [Security considerations]',
    '',
    '## AI Development Guidelines',
    'When working with this codebase:',
    '1. [Guideline 1]',
    '2. [Guideline 2]',
    '3. [Guideline 3]',
    '',
    '## Common Tasks',
    '### Adding a New Feature',
    '1. [Step-by-step process]',
    '',
    '### Fixing a Bug',
    '1. [Step-by-step process]',
    '',
    '### Refactoring',
    '1. [Step-by-step process]'
  ];

  return sections.join('\n');
}

/**
 * Generate comprehensive template (for init command)
 */
export function generateComprehensiveTemplate(vars: TemplateVariables): string {
  const sections = [
    `# Project: ${vars.projectName || 'test-project'}`,
    '',
    '## Overview',
    '[Add project description here]',
    '',
    generateArchitectureSection(vars),
    '',
    generateKeyCommandsSection(vars),
    '',
    generateClaudeCodeActionsSection(vars),
    '',
    generateAit3WorkflowSection(),
    '',
    '## Project Structure',
    '```',
    'src/',
    '├── commands/       # Pure function commands',
    '├── services/       # Service implementations',
    '├── common/        # Shared utilities and types',
    '└── assets/        # Templates and resources',
    '```',
    '',
    '## Testing Strategy',
    '- **Unit Tests**: Individual function testing',
    '- **Integration Tests**: Service and CLI testing',
    '- **Test Coverage**: 100% target coverage',
    `- **Framework**: ${vars.testFramework || 'unknown'}`,
    '',
    '## Development Setup',
    `1. Install dependencies: \`${vars.commands?.install || 'echo "No install command detected"'}\``,
    `2. Run tests: \`${vars.commands?.test || 'echo "No test command detected"'}\``,
    `3. Start development: \`${vars.commands?.dev || 'echo "No dev command detected"'}\``,
    `4. Build project: \`${vars.commands?.build || 'echo "No build command detected"'}\``
  ];

  return sections.join('\n');
}

/**
 * Add Docker section if Docker is detected
 */
export function generateDockerSection(hasDockerfile: boolean, composeFile?: string): string {
  if (!hasDockerfile) {
    return '';
  }

  const sections = [
    '',
    '## Docker Support',
    '- **Dockerfile**: Available for containerization'
  ];

  if (composeFile) {
    sections.push(`- **Docker Compose**: ${composeFile} for multi-service setup`);
  }

  return sections.join('\n');
}

/**
 * Generate AI development guidelines section
 */
export function generateAiGuidelinesSection(): string {
  return `## AI Development Guidelines
When working with this codebase:
1. Follow AIT³ workflow phases
2. Maintain 100% test pass rate
3. Use pure functions + service injection pattern
4. Create tickets for complex features
5. Document architectural decisions`;
}