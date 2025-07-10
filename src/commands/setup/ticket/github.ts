import type { CLIResult, Services } from '../../../common/types.js';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { validateTicketsDirectory, readConfig, writeConfig, buildTicketNotice } from '../common/config-utils.js';

const defaultExec = promisify(execCallback);

interface SetupOptions {
  force?: boolean;
  repository?: string;
}

export async function setupTicketGitHub(
  options: SetupOptions,
  services: Services,
  context: { cwd: string },
  exec = defaultExec
): Promise<CLIResult> {
  // Check if .tickets directory exists
  const dirError = await validateTicketsDirectory(context.cwd);
  if (dirError) return dirError;

  // Check if already configured
  const existingConfig = await readConfig(context.cwd);
  
  if (existingConfig.backend === 'github' && !options.force) {
    const currentRepo = existingConfig.github?.owner && existingConfig.github?.repo 
      ? `${existingConfig.github.owner}/${existingConfig.github.repo}`
      : 'unknown repository';
    return {
      success: true,
      message: `Already configured for GitHub (${currentRepo})`,
      data: {
        details: 'Use --force to reconfigure'
      }
    };
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
  let remoteName = 'origin';
  
  if (options.repository) {
    // Use provided repository
    const parts = options.repository.split('/');
    if (parts.length !== 2) {
      return {
        success: false,
        message: 'Invalid repository format',
        data: {
          details: 'Use format: owner/repo'
        }
      };
    }
    owner = parts[0];
    repo = parts[1];
    
    // Validate repository access
    try {
      await exec(`gh api repos/${owner}/${repo}`, { cwd: context.cwd });
    } catch {
      return {
        success: false,
        message: `Cannot access repository: ${owner}/${repo}`,
        data: {
          details: 'Check repository name and access permissions'
        }
      };
    }
  } else {
    // Auto-detect from git
    try {
      const { stdout } = await exec('git remote -v', { cwd: context.cwd });
      const lines = stdout.split('\n').filter(line => line.includes('(fetch)'));
      
      if (lines.length === 0) {
        // No remotes found
      } else if (lines.length === 1) {
        // Single remote
        const match = lines[0].match(/^(\S+)\s+(?:git@github\.com:|https:\/\/github\.com\/)([^/]+)\/([^.\s]+)/);
        if (match) {
          remoteName = match[1];
          owner = match[2];
          repo = match[3].replace(/\.git$/, '');
        }
      } else {
        // Multiple remotes - check if any are GitHub
        const gitHubRemotes = lines.filter(line => 
          line.match(/(?:git@github\.com:|https:\/\/github\.com\/)/)
        );
        
        if (gitHubRemotes.length > 1) {
          const remoteList = gitHubRemotes.map(line => {
            const match = line.match(/^(\S+)\s+(?:git@github\.com:|https:\/\/github\.com\/)([^/]+)\/([^.\s]+)/);
            if (match) {
              return `${match[1]}: ${match[2]}/${match[3].replace(/\.git$/, '')}`;
            }
            return null;
          }).filter(Boolean).join('\n');
          
          return {
            success: false,
            message: 'Multiple remotes found',
            data: {
              details: `Please specify which repository to use:\n${remoteList}\n\nRun: ait3 setup ticket github owner/repo`
            }
          };
        } else if (gitHubRemotes.length === 1) {
          // Only one GitHub remote among multiple remotes
          const match = gitHubRemotes[0].match(/^(\S+)\s+(?:git@github\.com:|https:\/\/github\.com\/)([^/]+)\/([^.\s]+)/);
          if (match) {
            remoteName = match[1];
            owner = match[2];
            repo = match[3].replace(/\.git$/, '');
          }
        }
      }
    } catch {
      // Not a git repo or no remote, continue with empty values
    }
  }

  // Update configuration
  const newConfig = {
    ...existingConfig,
    backend: 'github',
    github: {
      owner,
      repo,
      remote: remoteName,
      useGhCli: true,
      labels: {
        todo: 'status:todo',
        doing: 'status:doing',
        done: 'status:done',
      },
    },
  };

  await writeConfig(context.cwd, newConfig);

  // Check for existing local tickets
  let ticketNotice = '';
  if (existingConfig.backend === 'local' && services.ticketService) {
    try {
      const tickets = await services.ticketService.listTickets();
      ticketNotice = buildTicketNotice(tickets?.length || 0, 'local');
    } catch {
      // Ignore errors when checking tickets
    }
  }

  return {
    success: true,
    message: 'GitHub ticket backend configured successfully',
    data: {
      details: owner && repo 
        ? `Repository: ${owner}/${repo}${ticketNotice}` 
        : `Repository information not detected. Update .tickets/config.json manually.${ticketNotice}`
    }
  };
}