# Ticket #0002: CLI Ticket Create Command Integration

**Status**: done  
**Priority**: high  
**Created**: 2025-01-07T12:00:00Z  
**Updated**: 2025-01-07T13:06:00Z  
**Assignee**: development-team  
**Labels**: feature, cli, integration, low-risk  
**Type**: CORE-2 (CLI Integration)

## Description
Expose ticket creation functionality through the CLI interface. Create a new command using Commander.js, wire it to the TicketService, and handle user input. **Low-risk integration ticket** that builds on the validated service layer.

## TiDD Workflow Phases

### 🎭 PLANNING Phase: Architecture Design (COMPLETED)
**Outcome**: After Human decision on Claude vs Gemini approaches:
- **Architecture**: Pure Functions + Service Injection (Claude approach chosen)
- **Structure**: Hierarchical command groups with src/commands/ticket/index.ts
- **Extensibility**: Designed for multiple subcommands (create/list/show/start/complete)
- **CLI Framework**: Commander.js with service injection pattern
- **Testing**: Integration tests + Pure function unit tests

**Key Architectural Decisions:**
1. **Command Group Structure**: Move ticket command definitions to src/commands/ticket/index.ts
2. **Service Container**: Centralized dependency injection in command groups
3. **Pure Functions**: All business logic as testable pure functions
4. **Future Extensibility**: Ready for ticket list, show, start, complete commands

### 🔴 RED Phase: Integration Test Creation
- Write failing integration test in `tests/integration/cli.test.ts`
- Write failing unit tests for `createTicket` pure function
- Execute CLI command as child process: `node dist/cli.js ticket create "My First Ticket"`
- Assert new file creation in `.tickets/` directory with Real FS testing
- Include cleanup in test (delete created files/directories)

### 🟢 GREEN Phase: CLI Implementation
- Implement hierarchical command structure with src/commands/ticket/index.ts
- Implement pure function in `src/commands/ticket/create.ts`
- Accept `Services` container as dependency (service injection)
- Wire root CLI in `src/cli.ts` using Commander.js
- Handle argument parsing, validation, and beautiful output with chalk

### 🔧 REFACTOR Phase: User Experience
- Add user-friendly output with chalk colors (`"✅ Ticket #0001 created successfully."`)
- Enhance argument parsing (--priority, --assignee, --labels options)
- Improve error messages and validation with detailed feedback
- Add comprehensive help text and usage examples

### 📦 SQUASH Phase: Clean Integration
- Squash intermediate commits into single clean commit
- Verify end-to-end functionality with full CLI workflow

## Acceptance Criteria
- [ ] `ticket create <title>` command works via CLI
- [ ] Integration test validates end-to-end functionality
- [ ] Pure function pattern in `src/commands/ticket/create.ts`
- [ ] Service injection properly implemented
- [ ] User-friendly success/error messages
- [ ] Argument validation and error handling
- [ ] Help text and usage documentation
- [ ] ESM compatibility maintained

## Technical Requirements

### File Components (Updated Architecture)

#### **Hierarchical Command Structure**
```typescript
// src/cli.ts (Root CLI - Minimal)
import { Command } from 'commander';
import { ticketCommand } from './commands/ticket/index.js';

const program = new Command();
program
  .name('synapse')
  .description('Synapse - AI-Driven Development Platform')
  .version('1.0.0');

program.addCommand(ticketCommand);
program.parse();

// src/commands/ticket/index.ts (Command Group)
import { Command } from 'commander';
import { createTicket } from './create.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';

const services = { ticketService: new LocalTicketService() };

export const ticketCommand = new Command('ticket')
  .description('Ticket management commands');

ticketCommand
  .command('create <title>')
  .description('Create a new ticket')
  .option('-p, --priority <priority>', 'Set priority (low|medium|high|critical)', 'medium')
  .option('-a, --assignee <assignee>', 'Assign to user')
  .option('-l, --labels <labels>', 'Comma-separated labels')
  .action(async (title, options) => {
    const result = await createTicket({ title, ...options }, services);
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  });

// src/commands/ticket/create.ts (Pure Function)
interface CreateTicketArgs {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
}

interface Services {
  ticketService: TicketService;
}

export async function createTicket(
  args: CreateTicketArgs, 
  services: Services
): Promise<CLIResult> {
  // Validation
  if (!args.title?.trim()) {
    throw new ValidationError('Ticket title cannot be empty');
  }
  
  // Business logic
  const ticket = await services.ticketService.createTicket(args.title, {
    priority: args.priority,
    assignee: args.assignee,
    labels: args.labels || []
  });
  
  // User-friendly response with chalk
  return {
    success: true,
    message: chalk.green('✅ Ticket created successfully') + '\n' +
             chalk.white(`   ID: #${ticket.id}`) + '\n' +
             chalk.white(`   Title: ${ticket.title}`) + '\n' +
             chalk.gray(`   Location: .tickets/${ticket.status}/${ticket.id}-${slug}.md`),
    data: ticket
  };
}
```

#### **Enhanced Type Definitions**
```typescript
// src/common/types.ts (Extended)
export interface CreateTicketArgs {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
}

export interface Services {
  ticketService: TicketService;
  // Future services: gitService?, projectService?
}

export interface CLIResult {
  success: boolean;
  message: string;
  data?: any;
  exitCode?: number;
}
```

### Testing Strategy
- **Integration Tests**: Real CLI execution with file system validation
- **Coverage**: Full command workflow testing
- **Cleanup**: Automated test file/directory cleanup
- **Validation**: End-to-end ticket creation flow

## Dependencies
- **Required**: Ticket #0001 (CORE-1: Service Layer) ✅ COMPLETED
- **New Dependencies**: 
  - `commander` - CLI framework for hierarchical commands
  - `chalk` - Terminal colors and styling
- **Blocks**: None (this completes the vertical slice)

## Estimated Effort
- **Complexity**: Low
- **Time Estimate**: 0.5-1 day
- **Risk Level**: Low (integration only)

## Risk Mitigation
- Primary business logic already tested in service layer
- Integration tests provide confidence in CLI wiring
- Service injection pattern enables easy testing

## CLI Usage Examples (Updated Architecture)
```bash
# Install and build first
npm install commander chalk @types/node
npm run build

# Basic ticket creation
node dist/cli.js ticket create "Fix authentication bug"

# With all options
node dist/cli.js ticket create "Add dark mode" --priority high --assignee "john@example.com" --labels "feature,ui,enhancement"

# Help text for ticket commands
node dist/cli.js ticket --help

# Help text for create subcommand
node dist/cli.js ticket create --help

# Future commands (will be implemented later)
# node dist/cli.js ticket list
# node dist/cli.js ticket show 001
# node dist/cli.js ticket start 001
```

## Enhanced Output Format (with chalk colors)
```
✅ Ticket created successfully
   ID: #0001
   Title: Fix authentication bug
   Priority: medium
   Status: todo
   Assignee: john@example.com
   Labels: feature, ui, enhancement
   Location: .tickets/todo/0001-fix-authentication-bug.md
```

## Error Handling
- Invalid priority values
- Empty or invalid titles
- File system errors (permissions, disk space)
- Service layer errors propagation

## Notes
- Builds on validated service layer from CORE-1
- Completes the vertical slice validation
- Demonstrates full Pure Functions + Service Injection architecture
- Provides foundation for additional CLI commands

## Sub-tickets
- None (atomic implementation)

---

**TiDD Methodology**: This ticket completes the vertical slice validation, proving the entire Synapse architecture from CLI to file system through Test-Intelligence-Driven Development.