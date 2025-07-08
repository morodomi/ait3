import { Command } from 'commander';
import type { CLIResult } from '../../common/types.js';
import { join, dirname } from 'path';
import { mkdir, writeFile, access } from 'fs/promises';
import { FLOW_STYLES } from '../../common/styles.js';
import { ait3Template } from '../../assets/commands/ait3.js';
interface InstallCommandArgs {
  name?: string;
  force?: boolean;
}

export async function installCommand(
  args: InstallCommandArgs
): Promise<CLIResult> {
  const { name = 'all', force = false } = args;
  
  // Available command guides
  const commandGuides = {
    ait3: 'ait3.md'
  };
  
  // Determine which files to install
  let filesToInstall: Array<[string, string]> = [];
  
  if (name === 'all' || !name) {
    // Install all command guides
    filesToInstall = Object.entries(commandGuides);
  } else if (name in commandGuides) {
    // Install specific command guide
    filesToInstall = [[name, commandGuides[name as keyof typeof commandGuides]]];
  } else {
    // Invalid command name
    return {
      success: false,
      message: `${FLOW_STYLES.error('ERROR: Unknown command')}: ${name}\n${FLOW_STYLES.info('Available commands')}: ${Object.keys(commandGuides).join(', ')}`
    };
  }
  
  const messages: string[] = [];
  let installedCount = 0;
  let skippedCount = 0;
  let hasExistingFile = false;
  
  // Show intent
  if (!name || name === 'all') {
    messages.push(`${FLOW_STYLES.info('PACKAGE: Installing all command guides')}...`);
  }
  
  // Process each file
  for (const [cmdName, fileName] of filesToInstall) {
    const targetPath = join('.claude', 'commands', cmdName);
    const targetDir = dirname(targetPath);
    
    try {
      // Create directory if needed
      try {
        await access(targetDir);
      } catch {
        await mkdir(targetDir, { recursive: true });
        messages.push(`${FLOW_STYLES.success('SUCCESS:')} Created directory: ${FLOW_STYLES.path(targetDir)}`);
      }
      
      // Check if file exists
      let shouldWrite = true;
      try {
        await access(targetPath);
        hasExistingFile = true;
        if (!force) {
          shouldWrite = false;
          messages.push(`${FLOW_STYLES.warning('⚠')} Skipped: ${FLOW_STYLES.path(targetPath)} already exists (use --force to overwrite)`);
          skippedCount++;
        } else {
          messages.push(`${FLOW_STYLES.warning('⚠')} Overwriting existing file: ${FLOW_STYLES.path(targetPath)}`);
        }
      } catch {
        // File doesn't exist, good to proceed
      }
      
      if (shouldWrite) {
        // Load template content
        const templateContent = await getTemplateContent(cmdName);
        
        // Write file
        await writeFile(targetPath, templateContent, 'utf-8');
        messages.push(`${FLOW_STYLES.success('SUCCESS:')} Installed: ${FLOW_STYLES.path(targetPath)}`);
        installedCount++;
      }
      
    } catch (error) {
      return {
        success: false,
        message: `${FLOW_STYLES.error('ERROR: Failed to create')}: ${targetPath}\n${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Check if we were trying to install a single specific file that already exists
  if (name && name !== 'all' && filesToInstall.length === 1 && hasExistingFile && !force && installedCount === 0) {
    return {
      success: false,
      message: messages.join('\n')
    };
  }
  
  // Summary
  messages.push('');
  messages.push(`${FLOW_STYLES.success('SUCCESS: Installation complete')}: ${installedCount} file(s) installed${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`);
  
  return {
    success: true,
    message: messages.join('\n')
  };
}

async function getTemplateContent(commandName: string): Promise<string> {
  // Import templates based on command name
  if (commandName === 'ait3') {
    return ait3Template;
  }
  
  // Future templates can be added here:
  // if (commandName === 'gemini') {
  //   return geminiTemplate;
  // }
  
  throw new Error(`Template not found for command: ${commandName}`);
}

export const commandCommand = new Command('command')
  .description('Install Claude command guides')
  .argument('[name]', 'Command name to install (default: all)', 'all')
  .option('-f, --force', 'Overwrite existing files', false)
  .action(async (name: string, options: { force: boolean }) => {
    const args: InstallCommandArgs = { name, force: options.force };
    
    try {
      const result = await installCommand(args);
      console.log(result.message);
      
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });