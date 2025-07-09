import { join } from 'path';
import type { CLIResult } from '../../common/types.js';
import { STYLES } from '../../common/styles.js';
import { writeFileWithDirectoryCreation, generateFileOperationMessage } from '../../common/file-operations.js';
import { generateBasicTemplate } from '../../common/claude-md-templates.js';

interface InstallClaudeMdArgs {
  force?: boolean;
}

export async function installClaudeMdCommand(args: InstallClaudeMdArgs): Promise<CLIResult> {
  const { force = false } = args;
  
  const templatePath = join('src', 'assets', 'templates', 'claude-md-template.md');
  
  try {
    // Generate template content
    const templateContent = generateBasicTemplate();
    
    // Write template file with directory creation
    const result = await writeFileWithDirectoryCreation(templatePath, templateContent, force);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to create template'
      };
    }
    
    // Generate success message with next actions
    const nextActionText = `Edit the template at ${STYLES.info(templatePath)} to customize for your project.
For comprehensive analysis, use: ${STYLES.code('ait3 init claude-md')}`;
    
    const message = generateFileOperationMessage(
      templatePath,
      result,
      nextActionText
    );
    
    return {
      success: true,
      message: message.replace('File generated:', 'CLAUDE.md template generated:')
    };
    
  } catch (error) {
    return {
      success: false,
      message: `${STYLES.danger('ERROR: Failed to create')}: ${templatePath}
${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}