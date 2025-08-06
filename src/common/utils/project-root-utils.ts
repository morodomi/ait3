import { access, constants, stat, realpath } from 'fs/promises';
import { join, dirname, parse } from 'path';

// Constants for project root markers
const PROJECT_ROOT_MARKERS = {
  TICKETS: '.tickets',
  GIT: '.git'
} as const;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is owned by current user (security measure)
 */
async function isOwnedByCurrentUser(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    // On Windows, process.getuid() is undefined
    const uid = process.getuid?.();
    if (uid === undefined) {
      // On Windows, assume ownership is correct
      return true;
    }
    return stats.uid === uid;
  } catch {
    return false;
  }
}

/**
 * Find project root by searching upward for .tickets or .git directories.
 * 
 * Searches from the start path upward through parent directories until it finds:
 * 1. A .tickets directory (highest priority)
 * 2. A .git directory (fallback if no .tickets found)
 * 3. Returns the start path if neither found
 * 
 * @param startPath - The directory to start searching from (defaults to current working directory)
 * @returns The absolute path to the project root
 */
export async function findProjectRoot(startPath: string = process.cwd()): Promise<string> {
  // Resolve symbolic links for the search path
  const resolvedStart = await realpath(startPath);
  let current = resolvedStart;
  let previous = '';
  const root = parse(current).root;
  let foundGit: string | null = null;

  // Search upward until reaching filesystem root
  while (current !== root && current !== previous) {
    // Check for .tickets directory (highest priority)
    const ticketsPath = join(current, PROJECT_ROOT_MARKERS.TICKETS);
    if (await exists(ticketsPath)) {
      // Security: ownership check
      if (await isOwnedByCurrentUser(ticketsPath)) {
        return current;
      }
      console.warn(`Skipping ${ticketsPath}: not owned by current user`);
    }
    
    // Check for .git directory/file (remember first found)
    if (!foundGit) {
      const gitPath = join(current, PROJECT_ROOT_MARKERS.GIT);
      if (await exists(gitPath)) {
        // Security: ownership check
        if (await isOwnedByCurrentUser(gitPath)) {
          foundGit = current;
        } else {
          console.warn(`Skipping ${gitPath}: not owned by current user`);
        }
      }
    }
    
    // Move to parent directory
    previous = current;
    current = dirname(current);
  }
  
  // Return first found git if no .tickets was found
  if (foundGit) {
    return foundGit;
  }
  
  // Fallback to resolved start directory
  return resolvedStart;
}

/**
 * Get the project root directory, with support for environment variable override.
 * 
 * Checks in the following order:
 * 1. AIT3_PROJECT_ROOT environment variable (if set and valid)
 * 2. Automatic detection using findProjectRoot()
 * 
 * The environment variable path is validated for:
 * - Existence
 * - Ownership by current user (security check)
 * 
 * @returns The absolute path to the project root
 */
export async function getProjectRoot(): Promise<string> {
  // Check for explicit environment variable override
  if (process.env.AIT3_PROJECT_ROOT) {
    const envPath = process.env.AIT3_PROJECT_ROOT;
    
    try {
      // Resolve path
      const resolvedPath = await realpath(envPath);
      
      // Existence check
      if (!await exists(resolvedPath)) {
        throw new Error(`Path does not exist: ${envPath}`);
      }
      
      // Ownership check
      if (!await isOwnedByCurrentUser(resolvedPath)) {
        throw new Error(`Path not owned by current user: ${envPath}`);
      }
      
      return resolvedPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Invalid AIT3_PROJECT_ROOT: ${message}`);
      console.error('Falling back to automatic detection');
    }
  }
  
  // Automatic detection
  return findProjectRoot();
}