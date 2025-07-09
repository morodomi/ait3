import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const projectRoot = join(__dirname, '..', '..', '..');
export const cliPath = join(projectRoot, 'dist', 'cli.js');

// Helper function to create CLI command
export function cliCommand(args: string): string {
  return `node ${cliPath} ${args}`;
}