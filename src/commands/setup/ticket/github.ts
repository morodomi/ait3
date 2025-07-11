import type { CLIResult, Services } from '../../../common/types.js';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { Octokit } from '@octokit/rest';
import { validateTicketsDirectory, readConfig, writeConfig, buildTicketNotice } from '../common/config-utils.js';

const defaultExec = promisify(execCallback);

interface SetupOptions {
  force?: boolean;
  repository?: string;
}

/**
 * Validates GitHub repository identifier (owner or repo name)
 * GitHub allows: alphanumeric, hyphens, dots, underscores
 * But NOT: semicolons, pipes, command substitution, spaces, etc.
 */
function validateGitHubIdentifier(identifier: string): boolean {
  // GitHub username/repo rules: 
  // - Can contain alphanumeric characters, hyphens, dots, underscores
  // - Cannot start or end with hyphens, dots
  // - Cannot contain spaces or shell metacharacters
  const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
  return validPattern.test(identifier) && identifier.length > 0 && identifier.length <= 39;
}

/**
 * Safely gets GitHub auth token from gh CLI
 */
async function getGitHubAuthToken(exec: typeof defaultExec): Promise<string | null> {
  try {
    const { stdout } = await exec('gh auth token');
    return stdout.trim();
  } catch {
    return null;
  }
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
    const githubConfig = existingConfig.github;
    let currentRepo = 'unknown repository';
    
    if (githubConfig && typeof githubConfig === 'object' && 
        'owner' in githubConfig && 'repo' in githubConfig) {
      const config = githubConfig as { owner: string; repo: string };
      currentRepo = `${config.owner}/${config.repo}`;
    }
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
    
    // Validate GitHub identifiers to prevent injection
    if (!validateGitHubIdentifier(owner) || !validateGitHubIdentifier(repo)) {
      return {
        success: false,
        message: 'Invalid repository format',
        data: {
          details: 'Repository owner and name must contain only alphanumeric characters, hyphens, dots, and underscores'
        }
      };
    }
    
    // Validate repository access using Octokit API (secure)
    try {
      const authToken = await getGitHubAuthToken(exec);
      if (!authToken) {
        return {
          success: false,
          message: 'Cannot authenticate with GitHub',
          data: {
            details: 'Failed to get auth token from gh CLI'
          }
        };
      }
      
      const octokit = new Octokit({ auth: authToken });
      await octokit.rest.repos.get({ owner, repo });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Cannot access repository: ${owner}/${repo}`,
        data: {
          details: `Check repository name and access permissions. Error: ${errorMessage}`
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