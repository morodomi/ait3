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
    
    // 3. Generate all 3 files in parallel
    await Promise.all([
      generateClaudeAit3Md(analysis),
      generateMinimalClaudeMd(analysis),
      generateAit3InitCommand()
    ]);
    
    // 4. Success message
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

async function generateAit3InitCommand(): Promise<void> {
  await writeFile('.claude/commands/ait3-init', AIT3_INIT_GUIDE_TEMPLATE, 'utf-8');
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
  messages.push('Next steps:');
  messages.push('  1. Launch Claude Code: claude');
  messages.push('  2. Run: /ait3-init');
  messages.push('  3. Delete CLAUDE.ait3.md after integration');
  
  return messages.join('\n');
}