import type { CLIResult, Services } from '../../../common/types.js';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const defaultExec = promisify(execCallback);

interface SetupOptions {
  force?: boolean;
}

export async function setupTicketGitHub(
  options: SetupOptions,
  _services: Services,
  context: { cwd: string },
  exec = defaultExec
): Promise<CLIResult> {
  const configPath = join(context.cwd, '.tickets', 'config.json');

  // Check if .tickets directory exists
  try {
    await access(join(context.cwd, '.tickets'));
  } catch {
    return {
      success: false,
      message: 'No .tickets directory found',
      data: {
        details: 'Initialize the ticket system first with: ait3 ticket create "First ticket"'
      }
    };
  }

  // Check if already configured
  try {
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (config.backend === 'github' && !options.force) {
      return {
        success: true,
        message: 'Ticket backend is already configured for GitHub',
        data: {
          details: 'Use --force to reconfigure'
        }
      };
    }
  } catch (error) {
    // Config file might not exist or be invalid, continue setup
  }

  // Check for gh CLI
  try {
    await exec('gh --version', { cwd: context.cwd });
  } catch {
    return {
      success: false,
      message: 'GitHub CLI (gh) is not installed',
      data: {
        details: 'Install gh from: https://cli.github.com'
      }
    };
  }

  // Check gh auth status
  try {
    await exec('gh auth status', { cwd: context.cwd });
  } catch {
    return {
      success: false,
      message: 'Not authenticated with GitHub',
      data: {
        details: 'Run: gh auth login'
      }
    };
  }

  // Detect repository information
  let owner = '';
  let repo = '';
  
  try {
    const { stdout } = await exec('git remote -v', { cwd: context.cwd });
    const match = stdout.match(/origin\s+(?:git@github\.com:|https:\/\/github\.com\/)([^/]+)\/([^.]+)/);
    
    if (match) {
      owner = match[1];
      repo = match[2].replace(/\.git$/, '');
    }
  } catch {
    // Not a git repo or no remote, continue with empty values
  }

  // Update configuration
  let existingConfig: any = {};
  try {
    const configContent = await readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(configContent);
  } catch {
    // Use default config
  }

  const newConfig = {
    ...existingConfig,
    backend: 'github',
    github: {
      owner,
      repo,
      useGhCli: true,
      labels: {
        todo: 'status:todo',
        doing: 'status:doing',
        done: 'status:done',
      },
    },
  };

  await writeFile(configPath, JSON.stringify(newConfig, null, 2));

  return {
    success: true,
    message: 'GitHub ticket backend configured successfully',
    data: {
      details: owner && repo 
        ? `Repository: ${owner}/${repo}` 
        : 'Repository information not detected. Update .tickets/config.json manually.'
    }
  };
}