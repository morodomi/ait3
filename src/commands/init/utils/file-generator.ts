import { writeFile, access, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Utility for generating hierarchical CLAUDE.md files
 * Extracted for reusability and better testing
 */

interface TemplateFile {
  path: string;
  content: string;
}

/**
 * Check if a file exists
 * More robust than the previous inline implementation
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    // Only return false for ENOENT (file not found)
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    // Re-throw other errors (permissions, etc.)
    throw error;
  }
}

/**
 * Generate multiple files with automatic directory creation
 * Skips files that already exist to avoid overwriting
 */
export async function generateTemplateFiles(
  templates: TemplateFile[],
  options: { overwrite?: boolean } = {}
): Promise<void> {
  const { overwrite = false } = options;
  
  const tasks: Promise<void>[] = [];
  
  for (const template of templates) {
    if (!overwrite && await fileExists(template.path)) {
      continue; // Skip existing files
    }
    
    // Ensure directory exists
    const dir = dirname(template.path);
    if (dir !== '.') {
      await mkdir(dir, { recursive: true });
    }
    
    tasks.push(writeFile(template.path, template.content, 'utf-8'));
  }
  
  await Promise.all(tasks);
}

/**
 * Generate files with error handling and reporting
 * Returns information about what was actually created
 */
export async function generateTemplateFilesWithReport(
  templates: TemplateFile[],
  options: { overwrite?: boolean } = {}
): Promise<{
  created: string[];
  skipped: string[];
  errors: Array<{ path: string; error: string }>;
}> {
  const { overwrite = false } = options;
  const result = {
    created: [] as string[],
    skipped: [] as string[],
    errors: [] as Array<{ path: string; error: string }>
  };
  
  for (const template of templates) {
    try {
      if (!overwrite && await fileExists(template.path)) {
        result.skipped.push(template.path);
        continue;
      }
      
      // Ensure directory exists
      const dir = dirname(template.path);
      if (dir !== '.') {
        await mkdir(dir, { recursive: true });
      }
      
      await writeFile(template.path, template.content, 'utf-8');
      result.created.push(template.path);
      
    } catch (error) {
      result.errors.push({
        path: template.path,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return result;
}