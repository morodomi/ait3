import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { initCommandGroup } from './index.js';

describe('init command CLI integration', () => {
  it('should register init command with program', () => {
    const program = new Command();
    
    // This function should exist and register the command
    program.addCommand(initCommandGroup);
    
    const commands = program.commands.map(cmd => cmd.name());
    expect(commands).toContain('init');
  });

  it('should have correct command description', () => {
    const program = new Command();
    program.addCommand(initCommandGroup);
    
    const initCmd = program.commands.find(cmd => cmd.name() === 'init');
    expect(initCmd?.description()).toBe('Initialize AIT³ components');
  });
});