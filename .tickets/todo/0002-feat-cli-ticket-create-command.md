# Ticket #0002: CLI Ticket Create Command Integration

**Status**: todo  
**Priority**: high  
**Created**: 2025-01-07T12:00:00Z  
**Updated**: 2025-01-07T12:00:00Z  
**Assignee**: development-team  
**Labels**: feature, cli, integration, low-risk  
**Type**: CORE-2 (CLI Integration)

## Description
Expose ticket creation functionality through the CLI interface. Create a new command using Commander.js, wire it to the TicketService, and handle user input. **Low-risk integration ticket** that builds on the validated service layer.

## TiDD Workflow Phases

### 🔴 RED Phase: Integration Test Creation
- Write failing integration test in `tests/integration/cli.test.ts`
- Execute CLI command as child process: `node . ticket create "My First Ticket"`
- Assert new file creation in `.tickets/` directory
- Include cleanup in test (delete created files/directories)

### 🟢 GREEN Phase: CLI Implementation
- Implement pure function in `src/commands/ticket/create.ts`
- Accept `LocalTicketService` as dependency (service injection)
- Wire command in `src/cli.ts` using Commander.js
- Handle basic argument parsing and validation

### 🔧 REFACTOR Phase: User Experience
- Add user-friendly output (`"Ticket #0001 created successfully."`)
- Enhance argument parsing (multiple input formats)
- Improve error messages and validation
- Clean up CLI wiring code

### 📦 SQUASH Phase: Clean Integration
- Squash intermediate commits into single clean commit
- Verify end-to-end functionality

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

### File Components
```typescript
// src/commands/ticket/create.ts (Pure Function)
interface CreateTicketArgs {
  title: string;
  priority?: string;
  // ... other options
}

interface Services {
  ticketService: TicketService;
}

export async function createTicket(
  args: CreateTicketArgs, 
  services: Services
): Promise<CLIResult> {
  // Pure function implementation
}

// src/cli.ts (Commander.js integration)
program
  .command('ticket create <title>')
  .description('Create a new ticket')
  .option('-p, --priority <priority>', 'Set ticket priority')
  .action(async (title, options) => {
    const result = await createTicket(
      { title, ...options },
      { ticketService: new LocalTicketService() }
    );
    // Handle result output
  });
```

### Testing Strategy
- **Integration Tests**: Real CLI execution with file system validation
- **Coverage**: Full command workflow testing
- **Cleanup**: Automated test file/directory cleanup
- **Validation**: End-to-end ticket creation flow

## Dependencies
- **Required**: Ticket #0001 (CORE-1: Service Layer)
- **Blocks**: None (this completes the vertical slice)

## Estimated Effort
- **Complexity**: Low
- **Time Estimate**: 0.5-1 day
- **Risk Level**: Low (integration only)

## Risk Mitigation
- Primary business logic already tested in service layer
- Integration tests provide confidence in CLI wiring
- Service injection pattern enables easy testing

## CLI Usage Examples
```bash
# Basic ticket creation
node . ticket create "Fix authentication bug"

# With priority option
node . ticket create "Add dark mode" --priority high

# Help text
node . ticket create --help
```

## Output Format
```
✅ Ticket #0001 created successfully
   Title: Fix authentication bug
   Priority: medium
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