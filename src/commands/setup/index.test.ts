import { describe, it, expect } from 'vitest';
import { createSetupCommand } from './index.js';
import type { Services } from '../../common/types.js';

describe('createSetupCommand', () => {
  it('should create setup command with subcommands', () => {
    const services = {} as Services;
    const command = createSetupCommand(services);

    expect(command.name()).toBe('setup');
    expect(command.description()).toContain('Configure AIT³ settings');
    
    // Check for ticket subcommand
    const ticketCommand = command.commands.find(cmd => cmd.name() === 'ticket');
    expect(ticketCommand).toBeDefined();
    expect(ticketCommand?.description()).toContain('Configure ticket backend');
    
    // Check for github and local subcommands under ticket
    const githubCommand = ticketCommand?.commands.find(cmd => cmd.name() === 'github');
    expect(githubCommand).toBeDefined();
    expect(githubCommand?.description()).toContain('Configure GitHub as ticket backend');
    
    const localCommand = ticketCommand?.commands.find(cmd => cmd.name() === 'local');
    expect(localCommand).toBeDefined();
    expect(localCommand?.description()).toContain('Configure local file system as ticket backend');
  });

  it('should have correct github command arguments', () => {
    const services = {} as Services;
    const command = createSetupCommand(services);
    
    const ticketCommand = command.commands.find(cmd => cmd.name() === 'ticket');
    const githubCommand = ticketCommand?.commands.find(cmd => cmd.name() === 'github');
    
    // Check for optional repository argument
    // Commander stores arguments in registeredArguments property
    const args = (githubCommand as any).registeredArguments || (githubCommand as any)._args || [];
    expect(args.length).toBe(1);
    if (args[0]) {
      expect(args[0].name()).toBe('repository');
      expect(args[0].required).toBe(false);
    }
  });
});