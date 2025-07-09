import { initClaudeMdCommand } from './claude-md.js';
import { installCommand } from '../install/command.js';
import type { CLIResult } from '../../common/types.js';

interface InitArgs {
  subcommand?: string;
  force?: boolean;
  detailed?: boolean;
  json?: boolean;
  output?: string;
}

const CLAUDE_MD_INSTRUCTIONS = `

Next steps to generate CLAUDE.md:
1. Launch Claude Code in your terminal: claude
2. In Claude Code, run: /ait3-init
3. Follow the interactive guide to analyze your project and generate CLAUDE.md

The ait3-init guide will help you:
- Analyze your project structure and dependencies
- Detect build, test, and lint commands
- Understand your business logic
- Create a comprehensive CLAUDE.md file`;

/**
 * Handles the result of installing the ait3-init command guide
 */
function handleInstallResult(installResult: CLIResult): CLIResult {
  // If the guide already exists (not using force), still show instructions
  if (!installResult.success && installResult.message.includes('already exists')) {
    return {
      success: true,
      message: installResult.message + CLAUDE_MD_INSTRUCTIONS
    };
  }
  
  if (!installResult.success) {
    return installResult;
  }

  return {
    success: true,
    message: installResult.message + CLAUDE_MD_INSTRUCTIONS
  };
}

/**
 * Main init command router
 * Handles: ait3 init [subcommand]
 */
export async function initCommand(args: InitArgs): Promise<CLIResult> {
  const { subcommand } = args;

  switch (subcommand) {
  case 'claude-md':
    return initClaudeMdCommand(args);
    
  case undefined: {
    // Default behavior: install ait3-init guide
    const installResult = await installCommand({
      name: 'ait3-init',
      force: args.force
    });
    
    return handleInstallResult(installResult);
  }
    
  default:
    return {
      success: false,
      message: `Unknown init subcommand: ${subcommand}

Available subcommands:
  claude-md    Comprehensive project analysis and CLAUDE.md generation`
    };
  }
}