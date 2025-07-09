import { execSync, ExecSyncOptions } from 'child_process';
import { expect } from 'vitest';

/**
 * Execute a CLI command that is expected to fail and verify the error output
 * This prevents error messages from leaking to console during test runs
 * 
 * @param command - The command to execute
 * @param options - Options for execSync (stdio: 'pipe' will be enforced)
 * @param expectedError - String or regex to match against stderr/stdout
 */
export function expectCliError(
  command: string,
  options: ExecSyncOptions,
  expectedError?: string | RegExp
): void {
  try {
    execSync(command, { ...options, stdio: 'pipe' });
    expect.fail('Command should have failed');
  } catch (error: any) {
    expect(error.code).not.toBe(0);
    if (expectedError) {
      const output = error.stderr || error.stdout || '';
      if (typeof expectedError === 'string') {
        expect(output).toContain(expectedError);
      } else {
        expect(output).toMatch(expectedError);
      }
    }
  }
}

/**
 * Execute a CLI command that is expected to fail with specific exit code
 * 
 * @param command - The command to execute
 * @param options - Options for execSync (stdio: 'pipe' will be enforced)
 * @param expectedCode - Expected exit code
 */
export function expectCliExitCode(
  command: string,
  options: ExecSyncOptions,
  expectedCode: number
): void {
  try {
    execSync(command, { ...options, stdio: 'pipe' });
    expect.fail('Command should have failed');
  } catch (error: any) {
    expect(error.code).toBe(expectedCode);
  }
}