import { initClaudeMdCommand } from './claude-md.js';
import type { CLIResult } from '../../common/types.js';

interface InitArgs {
  subcommand?: string;
  force?: boolean;
  detailed?: boolean;
  json?: boolean;
  output?: string;
}

/**
 * Main init command router
 * Handles: ait3 init [subcommand]
 */
export async function initCommand(args: InitArgs): Promise<CLIResult> {
  const { subcommand } = args;

  switch (subcommand) {
  case 'claude-md':
    return await initClaudeMdCommand(args);
    
  case undefined:
    // Default behavior: install ait3-init guide
    return {
      success: true,
      message: `Init command requires a subcommand.

Available subcommands:
  ait3 init claude-md    Comprehensive project analysis and CLAUDE.md generation

For installing the ait3-init guide for Claude Code:
  ait3 install command ait3-init

For simple CLAUDE.md template generation:
  ait3 install claude-md`
    };
    
  default:
    return {
      success: false,
      message: `Unknown init subcommand: ${subcommand}

Available subcommands:
  claude-md    Comprehensive project analysis and CLAUDE.md generation`
    };
  }
}