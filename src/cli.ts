#!/usr/bin/env node
import { Command } from 'commander';
import { ticketCommand } from './commands/ticket/index.js';

const program = new Command();

program
  .name('ait3')
  .description('AIT³ Development Platform - AI + Ticket + Test + Tool driven development')
  .version('1.0.0');

// Add command groups
program.addCommand(ticketCommand);

// Future command groups will be added here:
// program.addCommand(tddCommand);
// program.addCommand(analyzeCommand);

program.parse();