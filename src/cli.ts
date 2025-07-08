#!/usr/bin/env node
import { Command } from 'commander';
import { ticketCommand } from './commands/ticket/index.js';
import { flowCommand } from './commands/flow/index.js';
import { installCommand } from './commands/install/index.js';

const program = new Command();

program
  .name('ait3')
  .description('AIT³ Development Platform - AI + Ticket + Test + Tool driven development')
  .version('1.0.0');

// Add command groups
program.addCommand(ticketCommand);
program.addCommand(flowCommand);
program.addCommand(installCommand);

// Future command groups will be added here:
// program.addCommand(analyzeCommand);

program.parse();