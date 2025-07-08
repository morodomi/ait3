import { describe, it, expect } from 'vitest';
import { installCommand } from './index.js';
import { Command } from 'commander';

describe('install command group', () => {
  it('should be a valid commander command', () => {
    expect(installCommand).toBeInstanceOf(Command);
    expect(installCommand.name()).toBe('install');
  });

  it('should have correct description', () => {
    expect(installCommand.description()).toContain('Install AIT³ components');
  });

  it('should have command subcommand', () => {
    const subcommands = installCommand.commands.map(cmd => cmd.name());
    expect(subcommands).toContain('command');
  });

  it('should have proper command structure', () => {
    const commandCmd = installCommand.commands.find(cmd => cmd.name() === 'command');
    expect(commandCmd).toBeDefined();
    expect(commandCmd?.description()).toContain('Install Claude command guides');
  });
});