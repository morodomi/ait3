/**
 * Common file operations utilities
 * Reduces code duplication for directory creation and file handling
 */

import { mkdir, writeFile, access, rename, rm } from 'fs/promises';
import { dirname } from 'path';
import { randomBytes } from 'crypto';
import { STYLES } from './styles.js';

export interface FileOperationResult {
  success: boolean;
  directoryCreated: boolean;
  fileOverwritten: boolean;
  message?: string;
}

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return false; // Directory already existed
  } catch {
    await mkdir(dirPath, { recursive: true });
    return true; // Directory was created
  }
}

/**
 * Check if file exists and handle force overwrite logic
 */
export async function checkFileExists(filePath: string, force: boolean = false): Promise<{
  exists: boolean;
  shouldWrite: boolean;
  message?: string;
}> {
  try {
    await access(filePath);
    // File exists
    if (!force) {
      return {
        exists: true,
        shouldWrite: false,
        message: `${STYLES.warning('⚠')} File ${STYLES.info(filePath)} already exists (use --force to overwrite)`
      };
    }
    return {
      exists: true,
      shouldWrite: true,
      message: `${STYLES.warning('⚠')} Overwriting existing file: ${STYLES.info(filePath)}`
    };
  } catch {
    // File doesn't exist
    return {
      exists: false,
      shouldWrite: true
    };
  }
}

/**
 * Write file with directory creation and error handling
 */
export async function writeFileWithDirectoryCreation(
  filePath: string,
  content: string,
  force: boolean = false
): Promise<FileOperationResult> {
  const fileDir = dirname(filePath);
  
  try {
    // Ensure directory exists
    const directoryCreated = await ensureDirectoryExists(fileDir);
    
    // Check if file exists and handle force logic
    const fileCheck = await checkFileExists(filePath, force);
    
    if (!fileCheck.shouldWrite) {
      return {
        success: false,
        directoryCreated,
        fileOverwritten: false,
        message: fileCheck.message
      };
    }
    
    // Write file
    await writeFile(filePath, content, 'utf-8');
    
    return {
      success: true,
      directoryCreated,
      fileOverwritten: fileCheck.exists,
      message: fileCheck.message
    };
    
  } catch (error) {
    return {
      success: false,
      directoryCreated: false,
      fileOverwritten: false,
      message: `${STYLES.danger('ERROR: Failed to create')}: ${filePath}\n${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create multiple directories in parallel
 */
export async function ensureMultipleDirectories(dirPaths: string[]): Promise<{
  success: boolean;
  createdDirectories: string[];
  message?: string;
}> {
  try {
    const results = await Promise.all(
      dirPaths.map(async (dirPath) => {
        const created = await ensureDirectoryExists(dirPath);
        return { dirPath, created };
      })
    );
    
    const createdDirectories = results
      .filter(result => result.created)
      .map(result => result.dirPath);
    
    return {
      success: true,
      createdDirectories
    };
    
  } catch (error) {
    return {
      success: false,
      createdDirectories: [],
      message: `${STYLES.danger('ERROR: Failed to create directories')}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate success message for file operations
 */
export function generateFileOperationMessage(
  filePath: string,
  result: FileOperationResult,
  nextActionText?: string
): string {
  const messages: string[] = [];
  
  if (result.directoryCreated) {
    const dirPath = dirname(filePath);
    messages.push(`${STYLES.success('SUCCESS:')} Created directory: ${STYLES.info(dirPath)}`);
  }
  
  if (result.fileOverwritten) {
    messages.push(`${STYLES.warning('⚠')} Overwriting existing file: ${STYLES.info(filePath)}`);
  }
  
  messages.push(`${STYLES.success('SUCCESS:')} File generated: ${STYLES.info(filePath)}`);
  
  if (nextActionText) {
    messages.push('');
    messages.push(`${STYLES.bold('Next Action')}:`);
    messages.push(nextActionText);
  }
  
  return messages.join('\n');
}

/**
 * Write file atomically using write-then-rename pattern
 * Ensures that concurrent reads never see partial content
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  // Generate unique temporary file name to avoid conflicts
  const hash = randomBytes(8).toString('hex');
  const tempFilePath = `${filePath}.tmp-${hash}`;
  
  try {
    // Step 1: Write content to temporary file
    await writeFile(tempFilePath, content, 'utf-8');
    
    // Step 2: Atomically rename temporary file to target file
    await rename(tempFilePath, filePath);
  } catch (error) {
    // Clean up temporary file on any error
    try {
      await rm(tempFilePath, { force: true });
    } catch {
      // Ignore cleanup errors - temp file might not exist
    }
    
    // Re-throw original error
    throw error;
  }
}

/**
 * Write file atomically with directory creation and force overwrite logic
 * Combines atomic write with existing directory creation patterns
 */
export async function atomicWriteFileWithDirectoryCreation(
  filePath: string,
  content: string,
  force: boolean = false
): Promise<FileOperationResult> {
  const fileDir = dirname(filePath);
  
  try {
    // Ensure directory exists
    const directoryCreated = await ensureDirectoryExists(fileDir);
    
    // Check if file exists and handle force logic
    const fileCheck = await checkFileExists(filePath, force);
    
    if (!fileCheck.shouldWrite) {
      return {
        success: false,
        directoryCreated,
        fileOverwritten: false,
        message: fileCheck.message
      };
    }
    
    // Write file atomically
    await atomicWriteFile(filePath, content);
    
    return {
      success: true,
      directoryCreated,
      fileOverwritten: fileCheck.exists,
      message: fileCheck.message
    };
    
  } catch (error) {
    return {
      success: false,
      directoryCreated: false,
      fileOverwritten: false,
      message: `${STYLES.danger('ERROR: Failed to create')}: ${filePath}\n${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}