import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { CLIResult } from '../../../common/types.js';

export interface ConfigOptions {
  cwd: string;
}

export async function validateTicketsDirectory(cwd: string): Promise<CLIResult | null> {
  try {
    await access(join(cwd, '.tickets'));
    return null; // No error
  } catch {
    return {
      success: false,
      message: 'No .tickets directory found',
      data: {
        details: 'Initialize the ticket system first with: ait3 ticket create "First ticket"'
      }
    };
  }
}

export async function readConfig(cwd: string): Promise<Record<string, unknown>> {
  const configPath = join(cwd, '.tickets', 'config.json');
  try {
    const configContent = await readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch {
    return {};
  }
}

export async function writeConfig(cwd: string, config: Record<string, unknown>): Promise<void> {
  const configPath = join(cwd, '.tickets', 'config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export function buildTicketNotice(ticketCount: number, backendType: 'local' | 'github'): string {
  if (ticketCount === 0) return '';
  
  const sourceType = backendType === 'local' ? 'local tickets' : 'GitHub issues';
  return `\n\nFound ${ticketCount} ${sourceType}. Use 'ait3 migrate' to transfer them.`;
}