import type { CLIResult, Services } from '../../common/types.js';
import type { ProjectAnalysis, DirectoryInfo } from '../../common/types/analyzer.js';
import chalk from 'chalk';

interface AnalyzeProjectArgs {
  path?: string;
  format?: string;
}

export async function analyzeProject(
  args: AnalyzeProjectArgs,
  services: Services
): Promise<CLIResult> {
  // Check if project analyzer service is available
  if (!services.projectAnalyzer) {
    return {
      success: false,
      message: chalk.red('Project analyzer service not available')
    };
  }

  try {
    // Analyze the project
    const analysis = await services.projectAnalyzer.analyzeProject(args.path);

    // Format the output based on requested format
    if (args.format === 'detailed') {
      return formatDetailedOutput(analysis);
    }

    // Default format
    return formatDefaultOutput(analysis);
  } catch (error) {
    return {
      success: false,
      message: chalk.red(`Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    };
  }
}

function formatDefaultOutput(analysis: ProjectAnalysis): CLIResult {
  const lines: string[] = [];

  // Project root
  lines.push(chalk.bold('Project Analysis'));
  lines.push(`Root: ${analysis.root}`);
  lines.push('');

  // Languages
  if (analysis.languages.length > 0) {
    lines.push(chalk.bold('Languages:'));
    analysis.languages.forEach((lang) => {
      const primary = lang.primaryLanguage ? ' (primary)' : '';
      const percentage = lang.percentage != null ? lang.percentage.toFixed(1) : '0.0';
      lines.push(`  ${lang.name}: ${percentage}% (${lang.files} files)${primary}`);
    });
  } else {
    lines.push(chalk.yellow('No languages detected'));
  }
  lines.push('');

  // Framework
  if (analysis.framework.name !== 'Unknown') {
    lines.push(chalk.bold('Framework:'));
    lines.push(`  ${analysis.framework.name} ${analysis.framework.version || ''} (${analysis.framework.type})`);
    lines.push('');
  }

  // Commands
  const commands = analysis.commands;
  const hasCommands = Object.values(commands).some((cmd) => cmd?.detected);
  
  if (hasCommands) {
    lines.push(chalk.bold('Commands:'));
    if (commands.test?.detected) {
      lines.push(`  Test: ${commands.test.command}`);
    }
    if (commands.lint?.detected) {
      lines.push(`  Lint: ${commands.lint.command}`);
    }
    if (commands.format?.detected) {
      lines.push(`  Format: ${commands.format.command}`);
    }
    if (commands.build?.detected) {
      lines.push(`  Build: ${commands.build.command}`);
    }
    lines.push('');
  }

  // Structure
  lines.push(chalk.bold('Project Structure:'));
  lines.push(`  Git Repository: ${analysis.structure.hasGitRepository ? '✓' : '✗'}`);
  lines.push(`  CI/CD: ${analysis.structure.hasCICD ? '✓' : '✗'}`);
  lines.push(`  Docker: ${analysis.structure.hasDocker ? '✓' : '✗'}`);
  
  if (analysis.structure.directories.length > 0) {
    lines.push(`  Directories: ${analysis.structure.directories.map((d) => d.name).join(', ')}`);
  }

  return {
    success: true,
    message: lines.join('\n'),
    data: analysis
  };
}

function formatDetailedOutput(analysis: ProjectAnalysis): CLIResult {
  const lines: string[] = [];

  lines.push(chalk.bold.blue('=== Project Analysis ==='));
  lines.push('');

  // Basic info
  lines.push(chalk.bold('Project Information'));
  lines.push(`  Path: ${analysis.root}`);
  lines.push(`  Analyzed: ${new Date(analysis.timestamp).toLocaleString()}`);
  lines.push('');

  // Languages with detailed info
  lines.push(chalk.bold('Languages'));
  if (analysis.languages.length > 0) {
    analysis.languages.forEach((lang) => {
      const marker = lang.primaryLanguage ? '* ' : '  ';
      lines.push(`  ${marker}${lang.name}`);
      const percentage = lang.percentage != null ? lang.percentage.toFixed(2) : '0.00';
      lines.push(`      Percentage: ${percentage}%`);
      lines.push(`      Files: ${lang.files}`);
    });
  } else {
    lines.push(chalk.gray('  No languages detected'));
  }
  lines.push('');

  // Framework
  lines.push(chalk.bold('Framework'));
  if (analysis.framework.name !== 'Unknown') {
    lines.push(`  Name: ${analysis.framework.name}`);
    if (analysis.framework.version) {
      lines.push(`  Version: ${analysis.framework.version}`);
    }
    lines.push(`  Type: ${analysis.framework.type}`);
    lines.push(`  Confidence: ${(analysis.framework.confidence * 100).toFixed(0)}%`);
  } else {
    lines.push(chalk.gray('  No framework detected'));
  }
  lines.push('');

  // Commands with source info
  lines.push(chalk.bold('Commands'));
  const commandTypes = ['test', 'lint', 'format', 'build'] as const;
  commandTypes.forEach(type => {
    const cmd = analysis.commands[type];
    if (cmd?.detected) {
      lines.push(`  ${capitalize(type)}:`);
      lines.push(`    Command: ${chalk.cyan(cmd.command)}`);
      lines.push(`    Source: ${cmd.source}`);
      lines.push(`    Confidence: ${(cmd.confidence * 100).toFixed(0)}%`);
    }
  });
  lines.push('');

  // Structure with directory details
  lines.push(chalk.bold('Structure'));
  lines.push(`  Git Repository: ${formatBoolean(analysis.structure.hasGitRepository)}`);
  lines.push(`  CI/CD Pipeline: ${formatBoolean(analysis.structure.hasCICD)}`);
  lines.push(`  Docker Support: ${formatBoolean(analysis.structure.hasDocker)}`);
  
  if (analysis.structure.directories.length > 0) {
    lines.push('  Directories:');
    analysis.structure.directories.forEach((dir: DirectoryInfo) => {
      const typeIcon = getDirectoryIcon(dir.type);
      lines.push(`    ${typeIcon} ${dir.name} (${dir.fileCount} files)`);
    });
  }

  const message = lines.join('\n');

  return {
    success: true,
    message,
    data: analysis
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatBoolean(value: boolean): string {
  return value ? chalk.green('✓ Yes') : chalk.gray('✗ No');
}

function getDirectoryIcon(type: string): string {
  const icons: Record<string, string> = {
    source: '[src]',
    test: '[test]',
    build: '[build]',
    config: '[config]',
    docs: '[docs]',
    other: '[other]'
  };
  return icons[type] || '[other]';
}