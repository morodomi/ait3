import type { CLIResult } from '../../common/types.js';
import { STYLES } from '../../common/styles.js';
import { ensureMultipleDirectories } from '../../common/file-operations.js';
import { writeFile } from 'fs/promises';
import { 
  generateComprehensiveTemplate, 
  generateAiGuidelinesSection,
  type TemplateVariables 
} from '../../common/claude-md-templates.js';
import { 
  AIT3_METHODOLOGY_TEMPLATE,
  AIT3_INIT_GUIDE_TEMPLATE
} from '../../common/ait3-templates.js';
import { analyzeProject, type ProjectAnalysis } from '../../common/project-analyzer.js';
import { 
  TYPESCRIPT_HIERARCHICAL_TEMPLATES,
  LARAVEL_HIERARCHICAL_TEMPLATES,
  FLASK_TEMPLATE_FILES
} from './templates/hierarchical-templates.js';
import { generateTemplateFiles } from './utils/file-generator.js';

interface InitArgs {
  subcommand?: string;
  force?: boolean;
  detailed?: boolean;
  json?: boolean;
  output?: string;
}


/**
 * Main init command - simplified to generate 3 files
 * No subcommands, always overwrites, Git-friendly
 */
export async function initCommand(args: InitArgs): Promise<CLIResult> {
  // Reject subcommands - they are no longer supported
  if (args.subcommand) {
    return {
      success: false,
      message: `Subcommands are no longer supported.
Use 'ait3 init' to generate all required files.

New workflow:
1. ait3 init
2. claude
3. /ait3-init`
    };
  }

  try {
    // 1. Analyze project
    const analysis = await analyzeProject();
    
    // 2. Create directories
    await ensureMultipleDirectories(['.claude/commands']);
    
    // 3. Generate base 3 files (review command is now installed separately via 'ait3 install command review')
    const baseFiles = [
      generateClaudeAit3Md(analysis),
      generateMinimalClaudeMd(analysis),
      generateAit3InitCommand(analysis.framework)
    ];
    
    // 4. Generate hierarchical files based on framework
    const hierarchicalFiles = await generateHierarchicalFiles(analysis.framework, analysis);
    
    // Execute all file generation
    await Promise.all([...baseFiles, ...hierarchicalFiles]);
    
    // 5. Success message
    return {
      success: true,
      message: formatSuccessMessage(analysis)
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}


async function generateClaudeAit3Md(analysis: ProjectAnalysis): Promise<void> {
  const templateVariables: TemplateVariables = {
    projectName: analysis.projectName,
    language: analysis.language,
    framework: analysis.framework,
    architecture: analysis.architecture,
    testFramework: analysis.testFramework,
    buildSystem: analysis.buildSystem,
    commands: analysis.commands
  };
  
  // Generate comprehensive template with AIT³ methodology
  let content = generateComprehensiveTemplate(templateVariables);
  
  // Add AI guidelines
  content += '\n\n' + generateAiGuidelinesSection();
  
  // Add AIT³ methodology
  content += AIT3_METHODOLOGY_TEMPLATE;
  
  await writeFile('CLAUDE.ait3.md', content, 'utf-8');
}

async function generateMinimalClaudeMd(analysis: ProjectAnalysis): Promise<void> {
  const content = `# ${analysis.projectName}

## Quick Start
- **Project type**: ${analysis.language}
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework}
- **Test runner**: ${analysis.testFramework}

## Commands
\`\`\`bash
${analysis.commands.install}
${analysis.commands.test}
${analysis.commands.build}
${analysis.commands.dev}
\`\`\`

## Next Steps
Run \`/ait3-init\` to generate a comprehensive CLAUDE.md with AIT³ methodology integrated.
`;
  
  await writeFile('.claude/CLAUDE.md', content, 'utf-8');
}

async function generateAit3InitCommand(framework: string): Promise<void> {
  let content = AIT3_INIT_GUIDE_TEMPLATE;
  
  // Add Flask-specific instructions if it's a Flask project
  if (framework === 'Flask') {
    const flaskInstructions = `

## Flask Project Instructions

This Flask project has template CLAUDE.md files generated:
- CLAUDE.flask-backend.md - Move to your backend code directory
- CLAUDE.flask-frontend.md - Move to your frontend/static directory  
- CLAUDE.flask-tests.md - Move to your tests directory
- CLAUDE.flask-infra.md - Move to your infrastructure/deployment directory

**IMPORTANT**: After moving, delete the original template files to avoid clutter:

\`\`\`bash
# Example: Move files to appropriate directories
mv CLAUDE.flask-backend.md app/CLAUDE.md
mv CLAUDE.flask-frontend.md static/CLAUDE.md
mv CLAUDE.flask-tests.md tests/CLAUDE.md
mv CLAUDE.flask-infra.md deploy/CLAUDE.md

# Clean up remaining template files (if any)
rm -f CLAUDE.flask-*.md
\`\`\`

Adjust paths based on your project structure.`;
    
    content = content.replace(
      '## Instructions',
      '## Instructions' + flaskInstructions
    );
  }
  
  await writeFile('.claude/commands/ait3-init', content, 'utf-8');
}


function formatSuccessMessage(analysis: ProjectAnalysis): string {
  const messages: string[] = [];
  
  messages.push(`${STYLES.success('SUCCESS:')} 3 files generated`);
  messages.push('');
  
  if (analysis.language !== 'Unknown') {
    messages.push(`${STYLES.info('Detected:')} ${analysis.language} project`);
  }
  
  messages.push('');
  messages.push('Files created:');
  messages.push('  - CLAUDE.ait3.md (temporary template)');
  messages.push('  - .claude/CLAUDE.md (minimal working version)');
  messages.push('  - .claude/commands/ait3-init (integration guide)');
  messages.push('');
  
  // Add framework-specific messages
  if (analysis.framework === 'TypeScript' || analysis.framework === 'Node.js Library') {
    messages.push('Hierarchical CLAUDE.md files:');
    messages.push('  - src/CLAUDE.md (implementation guidelines)');
    messages.push('  - tests/CLAUDE.md (testing strategy)');
    messages.push('');
  } else if (analysis.framework === 'Laravel') {
    messages.push('Hierarchical CLAUDE.md files:');
    messages.push('  - app/CLAUDE.md (backend guidelines)');
    messages.push('  - resources/views/CLAUDE.md (Blade templates)');
    messages.push('  - resources/js/CLAUDE.md (frontend code)');
    messages.push('  - tests/CLAUDE.md (testing strategy)');
    messages.push('  - CLAUDE.laravel-infra.md (infrastructure template)');
    messages.push('');
  } else if (analysis.framework === 'Flask') {
    messages.push('Flask template files generated:');
    messages.push('  - CLAUDE.flask-backend.md');
    messages.push('  - CLAUDE.flask-frontend.md');
    messages.push('  - CLAUDE.flask-tests.md');
    messages.push('  - CLAUDE.flask-infra.md');
    messages.push('');
    messages.push('Move these templates to appropriate directories');
    messages.push('');
  }
  
  messages.push('');
  messages.push('Next steps:');
  messages.push('  1. Launch Claude Code: claude');
  messages.push('  2. Run: /ait3-init');
  messages.push('  3. Delete CLAUDE.ait3.md after integration');
  
  return messages.join('\n');
}

async function generateHierarchicalFiles(framework: string, _analysis: ProjectAnalysis): Promise<Promise<void>[]> {
  const files: Promise<void>[] = [];
  
  if (framework === 'TypeScript' || framework === 'Node.js Library') {
    files.push(generateTemplateFiles(TYPESCRIPT_HIERARCHICAL_TEMPLATES));
  } else if (framework === 'Laravel') {
    files.push(generateTemplateFiles(LARAVEL_HIERARCHICAL_TEMPLATES));
  } else if (framework === 'Flask') {
    files.push(generateTemplateFiles(FLASK_TEMPLATE_FILES));
  }
  
  return files;
}

