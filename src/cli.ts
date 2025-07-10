#!/usr/bin/env node
import { Command } from 'commander';
import { ticketCommand } from './commands/ticket/index.js';
import { flowCommand } from './commands/flow/index.js';
import { installCommand } from './commands/install/index.js';
import { analyzeCommand } from './commands/analyze/index.js';
import { initCommandGroup } from './commands/init/index.cli.js';
import { migrateCommandGroup } from './commands/migrate/index.cli.js';

const program = new Command();

program
  .name('ait3')
  .description('AIT³ Development Platform - AI + Ticket + Test + Tool driven development')
  .version('1.1.0-dev');

// Add command groups
program.addCommand(ticketCommand);
program.addCommand(flowCommand);
program.addCommand(installCommand);
program.addCommand(analyzeCommand);
program.addCommand(initCommandGroup);
program.addCommand(migrateCommandGroup);

// Future command groups will be added here:

program.parse();